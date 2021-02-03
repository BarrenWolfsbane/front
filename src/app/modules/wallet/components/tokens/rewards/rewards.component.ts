import { Component, OnInit } from '@angular/core';
import {
  ContributionMetric,
  WalletTokenRewardsService,
} from './rewards.service';
import * as moment from 'moment';
import { Observable } from 'rxjs';
import { UniswapModalService } from '../../../../blockchain/token-purchase/v2/uniswap/uniswap-modal.service';
import { EarnModalService } from '../../../../blockchain/earn/earn-modal.service';

@Component({
  selector: 'm-wallet__tokenRewards',
  templateUrl: './rewards.component.html',
  styleUrls: [
    './rewards.component.ng.scss',
    '../../components/accordion/accordion.component.ng.scss',
  ],
  providers: [WalletTokenRewardsService],
})
export class WalletTokenRewardsComponent implements OnInit {
  /**
   * The reference date
   * */
  date = new Date();

  /**
   * The max date we can select
   */
  maxDate = new Date();

  /**
   * The row to expand
   * */
  expandedRow: string;

  /**
   * Totals
   */
  total = {
    daily: null,
    all_time: null,
  };

  /**
   * The data for the rows
   * TODO: add types
   */
  data;

  /** Breakdown of relative dates engangement scores */
  contributionScores$: Observable<ContributionMetric[]> = this.rewards
    .contributionScores$;

  /** Breakdown of relative dates liquidity */
  liquidityPositions$: Observable<any> = this.rewards.liquidityPositions$;

  constructor(
    private rewards: WalletTokenRewardsService,
    private uniswapModalService: UniswapModalService,
    private earnModalService: EarnModalService
  ) {}

  ngOnInit() {
    this.rewards.rewards$.subscribe(response => {
      this.total = response.total;
      this.data = response;
    });
  }

  /**
   * When the calendar changes, we reload the data
   * @param date
   */
  onDateChange(date) {
    this.date = new Date(date);
    this.total = { daily: null, all_time: null };
    this.data = null;
    this.rewards.setDate(date);
  }

  /**
   *
   */
  toggleRow(rowId: string): void {
    if (this.expandedRow === rowId) {
      this.expandedRow = null;
      return;
    }
    this.expandedRow = rowId;
  }

  /**
   * Returns the date in YYYY-MM-DD format
   */
  private getDate() {
    return (
      this.date.getUTCFullYear() +
      '-' +
      (this.date.getUTCMonth() + 1) +
      '-' +
      this.date.getUTCDate()
    );
  }

  round(number): number {
    return Math.round(number);
  }

  /**
   * Returns the friendly date
   */
  get friendlyDate(): string {
    const d = new Date(this.getDate());
    const m = moment(d.getTime());
    return m.calendar(null, {
      sameDay: '[Today]',
      nextDay: '[Tomorrow]',
      nextWeek: 'MMMM Do YYYY',
      lastDay: '[Yesterday]',
      lastWeek: 'MMMM Do',
      sameElse: () => {
        if (moment().year() === m.year()) {
          return 'MMMM Do';
        } else {
          return 'MMMM Do YYYY';
        }
      },
    });
  }

  /**
   * Open the new withdraw modal
   * @param e
   */
  onTransferClick(e: MouseEvent) {
    alert('This will open olivias modal changes');
  }

  /**
   * Opens the uniswap modal
   * @param e
   */
  onProvideLiquidityClick(e: MouseEvent) {
    this.uniswapModalService.open('add');
  }
}
