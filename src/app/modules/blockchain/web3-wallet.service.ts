import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Web3Provider, ExternalProvider } from '@ethersproject/providers';
import { BigNumber, BigNumberish, Contract, utils, Wallet } from 'ethers';
import BN from 'bn.js';
import { Web3ModalService } from '@mindsorg/web3modal-angular';
import { LocalWalletService } from './local-wallet.service';
import asyncSleep from '../../helpers/async-sleep';
import { TransactionOverlayService } from './transaction-overlay/transaction-overlay.service';
import { ConfigsService } from '../../common/services/configs.service';
import { defaultAbiCoder, Interface } from 'ethers/lib/utils';

type Address = string;

@Injectable()
export class Web3WalletService {
  public config; // TODO add types
  public provider: Web3Provider | null = null;
  protected unavailable: boolean = false;
  protected local: boolean = false;
  protected _ready: Promise<any>;
  protected _web3LoadAttempt: number = 0;

  constructor(
    protected localWallet: LocalWalletService,
    protected transactionOverlay: TransactionOverlayService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private configs: ConfigsService,
    private web3modalService: Web3ModalService
  ) {
    this.config = this.configs.get('blockchain');
  }

  async initializeProvider() {
    if (!this.provider) {
      const provider = await this.web3modalService.open();
      this.setProvider(provider);
    }

    return this.provider;
  }

  getSigner() {
    if (this.provider) {
      return this.provider.getSigner();
    }

    return null;
  }

  resetProvider() {
    this.provider = null;
    this.web3modalService.clearCachedProvider();
  }

  getABIInterface(abi: any) {
    return new Interface(abi);
  }

  setProvider(provider: ExternalProvider) {
    this.provider = new Web3Provider(provider);
  }

  async getWallets() {
    const address = await this.getCurrentWallet();

    if (!address) {
      return [];
    }

    return [address];
  }

  async getCurrentWallet(
    forceAuthorization: boolean = false
  ): Promise<string | false> {
    if (forceAuthorization) {
      await this.initializeProvider();
    }

    const signer = this.getSigner();

    if (!signer) {
      return false;
    }

    return await signer.getAddress();
  }

  async getBalance(): Promise<string | false> {
    const signer = this.getSigner();

    if (!signer) {
      return false;
    }

    const balance = await signer.getBalance();

    return balance.toString();
  }

  async isLocked() {
    return !(await this.getCurrentWallet());
  }

  async unlock() {
    if (await this.isLocked()) {
      try {
        await this.getCurrentWallet(true);
      } catch (e) {
        console.log(e);
      }
    }

    return !(await this.isLocked());
  }

  // Network

  async isSameNetwork() {
    const provider = this.provider;
    let chainId = null;

    if (provider) {
      const network = await provider.getNetwork();
      chainId = network.chainId;
    }

    return (chainId || 1) == this.config.client_network;
  }

  // Bootstrap

  setUp() {
    this.config = this.configs.get('blockchain');
  }

  isUnavailable() {
    return this.unavailable;
  }

  // Contract Methods

  async sendSignedContractMethodWithValue(
    contract: Contract,
    method: string,
    params: any[],
    value: number | string,
    message: string = ''
  ): Promise<string> {
    const connectedContract = contract.connect(this.getSigner());

    let gasLimit: string;

    try {
      gasLimit = (
        await connectedContract.estimateGas[method](...params, { value })
      ).toHexString();
    } catch (e) {
      console.log(e);
      gasLimit = BigNumber.from(15000000).toHexString();
    }

    const txHash = await this.transactionOverlay.waitForExternalTx(
      () =>
        connectedContract[method](...params, {
          value,
          gasLimit,
        }),
      message
    );

    await asyncSleep(1000); // Modals "cooldown"

    return txHash;
  }

  async sendSignedContractMethod(
    contract: any,
    method: string,
    params: any[],
    message: string = ''
  ): Promise<string> {
    return await this.sendSignedContractMethodWithValue(
      contract,
      method,
      params,
      0,
      message
    );
  }

  // Normal Transactions

  async sendTransaction(
    originalTxObject: any,
    message: string = ''
  ): Promise<string> {
    if (!originalTxObject.gasLimit) {
      try {
        const gasLimit = await this.getSigner().estimateGas(originalTxObject);
        originalTxObject.gasLimit = gasLimit.toHexString();
      } catch (e) {
        console.log(e);
        originalTxObject.gasLimit = 15000000;
      }
    }

    const txHash = await this.transactionOverlay.waitForExternalTx(
      () => this.getSigner().sendTransaction(originalTxObject),
      message
    );

    await asyncSleep(1000); // Modals "cooldown"

    return txHash;
  }

  getContract(address: Address, abi: string[]): Contract {
    return new Contract(address, abi);
  }

  toWei(amount: number | string, unit?: BigNumberish) {
    const weiAmount = utils.parseUnits(amount.toString(), unit).toString();
    return BigNumber.from(weiAmount).toHexString();
  }

  fromWei(amount: BigNumber, unit?: BigNumberish) {
    return utils.formatUnits(amount.toString(), unit).toString();
  }

  encodeParams(types: (string | utils.ParamType)[], values: any[]) {
    return defaultAbiCoder.encode(types, values);
  }

  privateKeyToAccount(privateKey: string | utils.Bytes | utils.SigningKey) {
    if (typeof privateKey === 'string') {
      if (privateKey.indexOf('0x') !== 0) {
        return new Wallet('0x' + privateKey).address;
      }
    }

    return new Wallet(privateKey).address;
  }

  getOnChainInterfaceLabel() {
    if (this.local) {
      return 'Private Key';
    }

    if (
      window.web3.currentProvider.constructor.name === 'MetamaskInpageProvider'
    ) {
      return 'Metamask';
    } else if (
      window.web3.currentProvider.constructor.name === 'EthereumProvider'
    ) {
      return 'Mist';
    } else if (window.web3.currentProvider.constructor.name === 'o') {
      return 'Parity';
    }

    return 'Local Interface';
  }

  // Service provider

  static _(
    localWallet: LocalWalletService,
    transactionOverlay: TransactionOverlayService,
    platformId: Object,
    configs: ConfigsService,
    web3modalService: Web3ModalService
  ) {
    return new Web3WalletService(
      localWallet,
      transactionOverlay,
      platformId,
      configs,
      web3modalService
    );
  }
}
