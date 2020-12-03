import {
  Component,
  Inject,
  EventEmitter,
  HostListener,
  HostBinding,
  Input,
} from '@angular/core';
import { Router } from '@angular/router';

import { GroupsService } from './groups.service';
import { Session } from '../../services/session';
import { LoginReferrerService } from '../../services/login-referrer.service';

@Component({
  selector: 'minds-groups-join-button',
  inputs: ['_group: group'],
  outputs: ['membership'],
  templateUrl: './groups-join-button.html',
})
export class GroupsJoinButton {
  showModal: boolean = false;
  group: any;
  membership: EventEmitter<any> = new EventEmitter();
  inProgress: boolean = false;

  @HostBinding('class.m-groupsJoin--iconsOnly')
  @Input()
  iconsOnly: boolean = false;

  constructor(
    public session: Session,
    public service: GroupsService,
    private router: Router,
    private loginReferrer: LoginReferrerService
  ) {}

  set _group(value: any) {
    this.group = value;
  }

  /**
   * Check if is a member
   */
  isMember() {
    if (this.group['is:member']) return true;
    return false;
  }

  /**
   * Check if the group is closed
   */
  isPublic() {
    if (this.group.membership !== 2) return false;
    return true;
  }

  /**
   * Join a group
   */
  join() {
    event.preventDefault();
    if (!this.session.isLoggedIn()) {
      //this.showModal = true;
      this.loginReferrer.register(
        `/groups/profile/${this.group.guid}/feed?join=true`
      );
      this.router.navigate(['/login']);
      return;
    }
    this.inProgress = true;
    this.service
      .join(this.group)
      .then(() => {
        this.inProgress = false;
        if (this.isPublic()) {
          this.group['is:member'] = true;
          this.membership.next({
            member: true,
          });
          return;
        }
        this.membership.next({});
        this.group['is:awaiting'] = true;
      })
      .catch(e => {
        let error = e.error;
        switch (e.error) {
          case 'You are banned from this group':
            error = 'banned';
            break;
          case 'User is already a member':
            error = 'already_a_member';
            break;
          default:
            error = e.error;
            break;
        }
        this.group['is:member'] = false;
        this.group['is:awaiting'] = false;
        this.membership.next({ error: error });
        this.inProgress = false;
      });
  }

  /**
   * Leave a group
   */
  leave() {
    event.preventDefault();
    this.service
      .leave(this.group)
      .then(() => {
        this.group['is:member'] = false;
        this.membership.next({
          member: false,
        });
      })
      .catch(e => {
        this.group['is:member'] = true;
      });
  }

  /**
   * Accept joining a group
   */
  accept() {
    this.group['is:member'] = true;
    this.group['is:invited'] = false;

    this.service.acceptInvitation(this.group).then((done: boolean) => {
      this.group['is:member'] = done;
      this.group['is:invited'] = !done;

      if (done) {
        this.membership.next({
          member: true,
        });
      }
    });
  }

  /**
   * Cancel a group joining request
   */
  cancelRequest() {
    this.group['is:awaiting'] = false;

    this.service.cancelRequest(this.group).then((done: boolean) => {
      this.group['is:awaiting'] = !done;
    });
  }

  /**
   * Decline joining a group
   */
  decline() {
    this.group['is:member'] = false;
    this.group['is:invited'] = false;

    this.service.declineInvitation(this.group).then((done: boolean) => {
      this.group['is:member'] = false;
      this.group['is:invited'] = !done;
    });
  }
}
