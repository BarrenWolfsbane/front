import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
  ViewRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Client } from '../../../../../services/api/client';
import { Session } from '../../../../../services/session';
import { Web3WalletService } from '../../../../blockchain/web3-wallet.service';
import { WalletV2Service } from '../../wallet-v2.service';
import { Filter } from '../../../../../interfaces/dashboard';
import toFriendlyCryptoVal from '../../../../../helpers/friendly-crypto';

import * as moment from 'moment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'm-walletTransactions--tokens',
  templateUrl: './transactions-tokens.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletTransactionsTokensComponent implements OnInit, OnDestroy {
  init: boolean = false;
  inProgress: boolean = false;
  offset: string;
  moreData: boolean = true;

  transactions: any[] = [];
  runningTotal: number = 0;
  currentDayInLoop = moment().add(1, 'day');

  selectedTransactionType: string = 'all';
  filterApplied: boolean = false;

  showRewardsPopup: boolean = false;
  startOfToday = moment().startOf('day');

  // For admins viewing a remote user's transactions
  remote: boolean = false;
  remoteUsername: string = '';
  paramsSubscription: Subscription;

  filter: Filter = {
    id: 'type',
    label: 'Type',
    options: [
      {
        id: 'all',
        label: 'All',
      },
      {
        id: 'offchain:wire',
        label: 'Off-Chain Wires',
      },
      {
        id: 'wire',
        label: 'On-Chain Wires',
      },
      {
        id: 'offchain:reward',
        label: 'Rewards',
      },
      {
        id: 'token',
        label: 'Purchases',
      },
      {
        id: 'offchain:boost',
        label: 'Off-Chain Boosts',
      },
      {
        id: 'boost',
        label: 'On-Chain Boosts',
      },
      {
        id: 'withdraw',
        label: 'On-Chain Transfers',
      },
    ],
  };

  constructor(
    protected client: Client,
    protected web3Wallet: Web3WalletService,
    protected cd: ChangeDetectorRef,
    protected router: Router,
    protected route: ActivatedRoute,
    protected session: Session,
    protected walletService: WalletV2Service
  ) {}

  ngOnInit() {
    this.paramsSubscription = this.route.params.subscribe(async params => {
      this.remote = !!params['remote'];
      this.remoteUsername = params['remote'] || '';
    });
    this.getBalance();
  }

  ngOnDestroy() {
    if (this.paramsSubscription) {
      this.paramsSubscription.unsubscribe();
    }
  }

  async getBalance() {
    const tokenAccounts = await this.walletService.getTokenAccounts();
    this.runningTotal = tokenAccounts.tokens.balance;
    this.loadTransactions(true);
  }

  async loadTransactions(refresh: boolean) {
    if (this.inProgress && !refresh) {
      return;
    }

    if (refresh) {
      this.transactions = [];
      this.offset = '';
      this.moreData = true;
    }

    this.inProgress = true;
    this.detectChanges();

    try {
      const opts: any = {
        from: 0,
        to: moment().unix(),
        offset: this.offset,
      };

      if (this.selectedTransactionType) {
        opts.contract =
          this.selectedTransactionType === 'all'
            ? ''
            : this.selectedTransactionType;
      }

      if (this.remote && this.remoteUsername) {
        opts.remote = this.remoteUsername;
      }

      const response: any = await this.walletService.getTokenTransactions(opts);

      if (response) {
        if (response.transactions) {
          this.formatResponse(response.transactions);
        }

        if (response['load-next']) {
          this.offset = response['load-next'];
        } else {
          this.moreData = false;
          this.inProgress = false;
        }
      } else {
        console.error('No data');
        this.moreData = false;
        this.inProgress = false;
      }
    } catch (e) {
      console.error(e);
      this.moreData = false;
    } finally {
      this.init = true;
      this.inProgress = false;
      this.detectChanges();
    }
  }

  formatResponse(transactions) {
    transactions.forEach(tx => {
      if (!tx.failed) {
        const formattedTx: any = {};

        const txAmount = toFriendlyCryptoVal(tx.amount);
        formattedTx.amount = txAmount;
        formattedTx.runningTotal = this.formatAmount(this.runningTotal);

        formattedTx.type = tx.contract;
        formattedTx.timestamp = tx.timestamp;

        if (tx.contract.indexOf('offchain:') !== -1) {
          formattedTx.superType = tx.contract.substr(9);
        } else {
          formattedTx.superType = tx.contract;
        }

        if (formattedTx.superType === 'reward') {
          formattedTx.showRewardsPopup = false;
        }

        if (formattedTx.superType === 'wire') {
          formattedTx.otherUser = this.getOtherUser(tx);
        }

        formattedTx.delta = this.getDelta(tx);

        const txMoment = moment(tx.timestamp * 1000).local();
        formattedTx.displayDate = null;
        formattedTx.displayTime = txMoment.format('hh:mm a');

        if (this.isNewDay(this.currentDayInLoop, txMoment)) {
          this.currentDayInLoop = txMoment;

          // If tx occured yesterday, use 'yesterday' instead of date
          const yesterday = moment().subtract(1, 'day');
          if (txMoment.isSame(yesterday, 'day')) {
            formattedTx.displayDate = 'Yesterday';
          } else {
            formattedTx.displayDate = moment(txMoment).format('ddd MMM Do');
          }
        }
        this.transactions.push(formattedTx);
      }
    });
    this.inProgress = false;
  }

  isNewDay(moment1, moment2) {
    return !moment1.isSame(moment2, 'day');
  }

  filterSelected($event) {
    const typeFilter = $event.option.id;
    if (typeFilter !== this.selectedTransactionType) {
      this.filterApplied = typeFilter === 'all' ? false : true;
      this.selectedTransactionType = typeFilter;
      this.loadTransactions(true);
    }
  }

  getOtherUser(tx) {
    const selfUsername = this.remote
        ? this.remoteUsername
        : this.session.getLoggedInUser().username,
      isSender =
        tx.sender.username.toLowerCase() !== selfUsername.toLowerCase(),
      user = isSender ? tx.sender : tx.receiver;

    return {
      avatar: `/icon/${user.guid}/medium/${user.icontime}`,
      username: user.username,
      isSender,
    };
  }

  formatAmount(amount) {
    const formattedAmount = {
      total: amount,
      int: 0,
      frac: null,
    };

    const splitBalance = amount.toString().split('.');

    formattedAmount.int = splitBalance[0];
    if (splitBalance[1]) {
      formattedAmount.frac = splitBalance[1].slice(0, 3);
    }
    return formattedAmount;
  }

  getDelta(tx) {
    let delta = 'neutral';
    if (tx.type !== 'withdraw') {
      delta = tx.amount < 0 ? 'negative' : 'positive';
    }
    return delta;
  }

  detectChanges() {
    if (!(this.cd as ViewRef).destroyed) {
      this.cd.markForCheck();
      this.cd.detectChanges();
    }
  }
}