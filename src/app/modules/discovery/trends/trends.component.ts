import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DiscoveryTrendsService } from './trends.service';
import {
  Router,
  ActivatedRoute,
  RouterEvent,
  NavigationEnd,
} from '@angular/router';
import {
  filter,
  pairwise,
  startWith,
  takeUntil,
  map,
  debounceTime,
} from 'rxjs/operators';
import { Subscription, combineLatest, Observable } from 'rxjs';
import { FastFadeAnimation } from '../../../animations';
import { DiscoveryFeedsService } from '../feeds/feeds.service';
import { FeedsService } from '../../../common/services/feeds.service';

@Component({
  selector: 'm-discovery__trends',
  templateUrl: './trends.component.html',
  animations: [FastFadeAnimation],
  providers: [DiscoveryFeedsService, FeedsService],
})
export class DiscoveryTrendsComponent implements OnInit, OnDestroy {
  trends$ = this.discoveryService.trends$;
  hero$ = this.discoveryService.hero$;
  inProgress$ = this.discoveryService.inProgress$;
  showNoTagsPrompt$: Observable<boolean> = this.discoveryService.error$.pipe(
    map((errorId: string): boolean => {
      return errorId === 'Minds::Core::Discovery::NoTagsException';
    })
  );
  routerEventsSubscription: Subscription;
  entities$ = this.discoveryFeedsService.entities$;
  hasMoreData$ = this.discoveryFeedsService.hasMoreData$;

  showPreferredFeed: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private discoveryService: DiscoveryTrendsService,
    private discoveryFeedsService: DiscoveryFeedsService
  ) {}

  ngOnInit() {
    this.routerEventsSubscription = this.router.events
      .pipe(
        filter((event: RouterEvent) => event instanceof NavigationEnd),
        pairwise(),
        filter((events: RouterEvent[]) => events[0].url === events[1].url),
        startWith('Initial call')
        // takeUntil(this.destroyed)
      )
      .subscribe(() => {
        if (
          this.route.snapshot.queryParamMap.get('reload') !== 'false' ||
          !this.trends$.getValue().length
        ) {
          // if we say not to reload or nothing
          this.discoveryService.loadTrends();
        }
      });
  }

  loadMore() {
    this.discoveryFeedsService.loadMore();
  }

  @HostListener('window:scroll', ['$event']) // for window scroll events
  onScroll(event) {
    const element = event.target.activeElement;
    if (
      !this.showPreferredFeed &&
      element.scrollTop + element.clientHeight / 2 >= element.scrollHeight / 2
    ) {
      this.showPreferredFeed = true;
      this.discoveryFeedsService.setFilter('prefered');
      this.discoveryFeedsService.load();
    }
  }

  ngOnDestroy() {
    this.routerEventsSubscription.unsubscribe();
  }

  refresh(): void {
    this.discoveryService.loadTrends();
  }
}
