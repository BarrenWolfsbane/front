import { Component, OnInit, OnDestroy, Input, HostListener } from '@angular/core';
import { Location } from '@angular/common';
import { Router, Event, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { Session } from '../../../services/session';
import { OverlayModalService } from '../../../services/ux/overlay-modal';

@Component({
  selector: 'm-media--modal',
  templateUrl: 'modal.component.html'
})

export class MediaModalComponent implements OnInit, OnDestroy {
  minds = window.Minds;
  entity: any = {};
  title: string = '';
  boosted: boolean;
  inProgress: boolean = true;
  isFullscreen: boolean = false;
  navigatedAway: boolean = false;
  hovering: boolean = false; // Used for fullscreen button transformation

  routerSubscription: Subscription;

  @Input('entity') set data(entity) {
    this.entity = entity;
  }

  constructor(
    public session: Session,
    private overlayModal: OverlayModalService,
    private router: Router,
    private location: Location
  ) {
  }

  ngOnInit() {
    console.log(this.entity);
    this.entity.thumbnail = `${this.minds.cdn_url}fs/v1/thumbnail/${this.entity.entity_guid}/xlarge`;
    this.boosted = this.entity.boosted || this.entity.p2p_boosted;
    this.title = this.entity.message ? this.entity.message : `${this.entity.ownerObj.name}'s post`;

    // Change the url to point to media page so user can easily share link
    // (but don't actually redirect)
    this.location.replaceState(`/media/${this.entity.entity_guid}`);

    // When user clicks a link from inside the modal
    this.routerSubscription = this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {

        if (!this.navigatedAway) {
          this.navigatedAway = true;

          // Fix browser history so back button doesn't go to media page
          this.location.replaceState(this.entity.modal_source_url);

          // Go to the intended destination
          this.router.navigate([event.url]);

          this.overlayModal.dismiss();
        }
      }

    });
  }


  // @HostListener('window:beforeunload', ['$event'])
  //  onWindowClose(event: any): void {
  //   // Do something

  //    event.preventDefault();
  //    event.returnValue = false;

  // }


  // Hijack browser refresh so it doesn't go to faux media page url
  // @HostListener('window:beforeunload', ['$event'])
  // onBeforeUnload(event) {
  //   console.log('***rfeeeresh');
  //   event.preventDefault();
  //   console.log('default prevented');


  //   // Fix browser history so browser refresh doesn't go to media page
  //   this.location.replaceState(this.entity.modal_source_url);


  //   // event.returnValue = ''; // Required for chrome

  //   // Then do the refresh
  //   // window.location.reload();

  //   // Prevent browser popup reload confirmation dialog
  //   return;
  // }

  // // TEMP
  // hoverCheck(state: string) {
  //   console.log('*** ' + state);
  // }




  // TODO OJM is there a better way to get this?
  getOwnerIconTime() {
    const session = this.session.getLoggedInUser();
    if (session && session.guid === this.entity.ownerObj.guid) {
      return session.icontime;
    } else {
      return this.entity.ownerObj.icontime;
    }
  }

  ngOnDestroy() {
    console.log('***destroyed');
    // If the modal was closed without a redirect, replace media page url
    // with original source url and fix browser history so back button
    // doesn't go to media page
    if (!this.navigatedAway) {
      this.location.replaceState(this.entity.modal_source_url);
    }
  }

  // Listen for fullscreen change event in case user exits full screen without clicking button
  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onFullscreenChange(event) {
    if (!document.fullscreenElement && !document['webkitFullScreenElement'] && !document['mozFullScreenElement'] && !document['msFullscreenElement']) {
      this.isFullscreen = false;
    } else {
      this.isFullscreen = true;
    }
  }

  toggleFullscreen() {
    const elem = document.querySelector('.m-mediaModal__theater');

    // If fullscreen is not already enabled
    if (!document['fullscreenElement'] && !document['webkitFullScreenElement'] && !document['mozFullScreenElement'] && !document['msFullscreenElement']) {
      // Request full screen
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem['webkitRequestFullscreen']) {
        elem['webkitRequestFullscreen']();
      } else if (elem['mozRequestFullScreen']) {
        elem['mozRequestFullScreen']();
      } else if (elem['msRequestFullscreen']) {
        elem['msRequestFullscreen']();
      }
      this.isFullscreen = true;
      return;
    }

    // If fullscreen is already enabled, exit it
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document['webkitExitFullscreen']) {
      document['webkitExitFullscreen']();
    } else if (document['mozCancelFullScreen']) {
      document['mozCancelFullScreen']();
    } else if (document['msExitFullscreen']) {
      document['msExitFullscreen']();
    }
    this.isFullscreen = false;
  }

}

