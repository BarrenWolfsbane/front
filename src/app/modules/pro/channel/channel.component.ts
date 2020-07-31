import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  UrlSegment,
  NavigationEnd,
} from '@angular/router';
import { Session } from '../../../services/session';
import { Subscription } from 'rxjs';
import { MindsUser } from '../../../interfaces/entities';
import { Client } from '../../../services/api/client';
import { ProChannelService } from './channel.service';
import { SignupModalService } from '../../modals/signup/service';
import { OverlayModalService } from '../../../services/ux/overlay-modal';
import { OverlayModalComponent } from '../../../common/components/overlay-modal/overlay-modal.component';
import { SessionsStorageService } from '../../../services/session-storage.service';
import { SiteService } from '../../../common/services/site.service';
import { ScrollService } from '../../../services/ux/scroll';
import { captureEvent } from '@sentry/core';
import { isPlatformServer } from '@angular/common';
import { PageLayoutService } from '../../../common/layout/page-layout.service';
import { filter } from 'rxjs/operators';
import { FormToastService } from '../../../common/services/form-toast.service';

@Component({
  providers: [ProChannelService, OverlayModalService, SignupModalService],
  selector: 'm-pro--channel',
  templateUrl: 'channel.component.html',
  styleUrls: ['channel.component.ng.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ProChannelComponent implements OnInit, AfterViewInit, OnDestroy {
  username: string;

  type: string;

  query: string;

  channel: MindsUser;

  inProgress: boolean;

  error: string;

  collapseNavItems: boolean;

  showSplash: boolean = false;

  protected params$: Subscription;

  protected loggedIn$: Subscription;

  protected routerEventsSubscription: Subscription;

  @ViewChild('overlayModal', { static: true })
  protected overlayModal: OverlayModalComponent;

  get currentUser() {
    if (!this.session.isLoggedIn()) {
      return null;
    }

    return this.session.getLoggedInUser();
  }

  get homeRouterLink() {
    return this.channelService.getRouterLink('home');
  }

  get feedRouterLink() {
    let params;

    if (this.query) {
      params = { query: this.query };
    }

    return this.channelService.getRouterLink('feed', params);
  }

  get videosRouterLink() {
    let params;

    if (this.query) {
      params = { query: this.query };
    }

    return this.channelService.getRouterLink('videos', params);
  }

  get imagesRouterLink() {
    let params;

    if (this.query) {
      params = { query: this.query };
    }

    return this.channelService.getRouterLink('images', params);
  }

  get articlesRouterLink() {
    let params;

    if (this.query) {
      params = { query: this.query };
    }

    return this.channelService.getRouterLink('articles', params);
  }

  get groupsRouterLink() {
    return this.channelService.getRouterLink('groups');
  }

  get proSettingsLink() {
    return [`/settings/pro_canary/${this.username}`];
  }

  get proSettingsHref() {
    return this.site.baseUrl + `settings/pro_canary/${this.username}`;
  }

  get isProDomain() {
    return this.site.isProDomain;
  }

  get lowestPrice() {
    const moneyRewards = this.channel.wire_rewards.rewards.money;
    if (moneyRewards[0]) {
      return moneyRewards[0].amount;
    }
  }

  get hideLoginRow() {
    let isOwner = false;
    // todoojm uncomment
    // if (this.currentUser) {
    //   isOwner = this.currentUser?.guid === this.channel.guid;
    // }
    const isMember = false; // todoojm

    return isOwner || isMember;
  }

  @HostBinding('style.backgroundImage') get backgroundImageCssValue() {
    if (!this.channel || !this.channel.pro_settings.background_image) {
      return 'none';
    }

    return `url(${this.channel.pro_settings.background_image})`;
  }

  @HostBinding('class') get cssColorSchemeOverride() {
    if (!this.channel) {
      return '';
    }

    const classes = [
      'm-theme--wrapper',
      `m-theme--wrapper__${this.channel.pro_settings.scheme || 'light'}`,
    ];

    if (!this.channel || !this.channel.pro_settings.background_image) {
      classes.push('m-pro-channel--plainBackground');
    }

    return classes.join(' ');
  }

  constructor(
    public session: Session,
    protected element: ElementRef,
    protected channelService: ProChannelService,
    protected client: Client,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cd: ChangeDetectorRef,
    protected modal: SignupModalService,
    protected modalService: OverlayModalService,
    protected sessionStorage: SessionsStorageService,
    protected site: SiteService,
    protected injector: Injector,
    @Inject(PLATFORM_ID) private platformId: Object,
    protected pageLayoutService: PageLayoutService,
    protected toasterService: FormToastService
  ) {}

  ngOnInit() {
    if (this.site.isProDomain) {
      this.username = this.site.pro.user_guid;
    }

    this.listen();
    // this.onResize();
    this.pageLayoutService.useFullWidth();
  }

  ngAfterViewInit() {
    this.modalService
      .setContainer(this.overlayModal)
      .setRoot(this.element.nativeElement);
  }

  listen() {
    this.params$ = this.route.params.subscribe(params => {
      if (params['username']) {
        this.username = params['username'];
      }

      if (params['type']) {
        this.type = params['type'];
      }

      if (
        this.username &&
        (!this.channel || this.channel.username != this.username)
      ) {
        this.load();
      }
    });

    this.loggedIn$ = this.session.loggedinEmitter.subscribe(is => {
      if (is) {
        this.reload();
      }
    });

    this.routerEventsSubscription = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(data => {
        this.pageLayoutService.useFullWidth();
      });
  }

  // @HostListener('window:resize') onResize() {
  //   this.collapseNavItems = window.innerWidth <= 768;
  // }

  ngOnDestroy() {
    this.params$.unsubscribe();
    this.routerEventsSubscription.unsubscribe();
  }

  async load() {
    this.error = null;

    if (!this.username) {
      return;
    }

    this.inProgress = true;
    this.detectChanges();

    try {
      this.channel = await this.channelService.load(this.username);

      this.bindCssVariables();
      this.setSplash();
      this.shouldOpenWireModal();
    } catch (e) {
      this.error = e.message;
      this.toasterService.error(this.error);
      console.error(e);
      captureEvent(e);

      if (e.message === 'E_NOT_PRO') {
        if (this.site.isProDomain) {
          this.error = 'This is not a Minds Pro channel...';
          this.toasterService.error(this.error);
        } else {
          this.router.navigate(['/', this.username || ''], {
            replaceUrl: true,
          });
          return;
        }
      }
    }

    this.detectChanges();
  }

  async reload() {
    this.error = null;

    try {
      this.channel = await this.channelService.reload(this.username);

      this.setSplash();
      this.shouldOpenWireModal();
    } catch (e) {
      console.error(e);
      captureEvent(e);
      this.error = e.message;
      this.toasterService.error(this.error);
    }

    this.detectChanges();
  }

  setSplash(): void {
    this.showSplash =
      !this.currentUser &&
      this.channel.pro_settings.splash &&
      this.site.isProDomain;
  }

  bindCssVariables() {
    if (isPlatformServer(this.platformId)) return;
    let styles = this.channel.pro_settings.styles;

    /**
     * Create secondary text and border colors
     * from text color w/ reduced opacity
     */
    const textColor = styles['text_color'];
    if (textColor) {
      const additionalColors = {
        secondary_text_color: textColor + 'B3',
        border_color: textColor + '80',
      };

      styles = { ...styles, ...additionalColors };
    }

    for (const style in styles) {
      if (!styles.hasOwnProperty(style)) {
        continue;
      }

      let value =
        typeof styles[style] === 'string' ? styles[style].trim() : null;

      if (!value) {
        continue;
      }

      const styleAttr = style.replace(/_/g, '-');

      this.element.nativeElement.style.setProperty(
        `--m-pro--${styleAttr}`,
        styles[style]
      );
    }
  }

  wire() {
    this.channelService.wire();
  }

  search(): Promise<boolean> {
    return this.router.navigate(
      this.channelService.getRouterLink('all', { query: this.query })
    );
  }

  clearSearch() {
    this.query = '';
    const cleanUrl = this.router.url.split(';')[0];
    this.router.navigate([cleanUrl]);
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }

  private shouldOpenWireModal() {
    if (this.sessionStorage.get('pro::wire-modal::open')) {
      this.wire();
    }
  }
}
