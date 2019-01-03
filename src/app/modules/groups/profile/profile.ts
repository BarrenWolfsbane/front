import { Component, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, ChildActivationEnd, NavigationEnd, Router } from '@angular/router';

import { Subscription } from 'rxjs';

import { GroupsService } from '../groups-service';

import { RecentService } from '../../../services/ux/recent';
import { MindsTitle } from '../../../services/ux/title';
import { Session } from '../../../services/session';
import { SocketsService } from '../../../services/sockets';

import { GroupsProfileFeed } from './feed/feed';
import { ContextService } from '../../../services/context.service';
import { Client } from '../../../services/api';
import { HashtagsSelectorComponent } from '../../hashtags/selector/selector.component';
import { VideoChatService } from '../../videochat/videochat.service';
import { UpdateMarkersService } from '../../../common/services/update-markers.service';
import { filter } from "rxjs/operators";

@Component({
  moduleId: module.id,
  selector: 'minds-groups-profile',
  templateUrl: 'profile.html'
})

export class GroupsProfile {

  guid;
  filter = 'activity';
  group;
  postMeta: any = {
    message: '',
    container_guid: 0
  };
  editing: boolean = false;
  editDone: boolean = false;
  minds = window.Minds;

  showRight: boolean = true;
  activity: Array<any> = [];
  offset: string = '';
  inProgress: boolean = false;
  moreData: boolean = true;
  paramsSubscription: Subscription;
  childParamsSubscription: Subscription;

  socketRoomName: string;
  newConversationMessages: boolean = false;

  @ViewChild('feed') private feed: GroupsProfileFeed;
  @ViewChild('hashtagsSelector') hashtagsSelector: HashtagsSelectorComponent;

  private reviewCountInterval: any;
  private socketSubscription: any;

  constructor(
    public session: Session,
    public service: GroupsService,
    public route: ActivatedRoute,
    private router: Router,
    public title: MindsTitle,
    private sockets: SocketsService,
    private context: ContextService,
    private recent: RecentService,
    private client: Client,
    public videochat: VideoChatService,
    private cd: ChangeDetectorRef,
    private updateMarkers: UpdateMarkersService,
  ) { }

  ngOnInit() {
    this.context.set('activity');
    this.listenForNewMessages();
    this.detectWidth();

    this.paramsSubscription = this.route.params.subscribe(params => {
      if (params['guid']) {
        let changed = params['guid'] !== this.guid;

        this.guid = params['guid'];
        this.postMeta.container_guid = this.guid;

        if (changed) {
          this.group = void 0;

          this.load()
            .then(() => {
              this.filterToDefaultView();
            });
        }
      }

      if (params['filter']) {
        this.filter = params['filter'];

        if (this.filter == 'conversation') {
          this.newConversationMessages = false;
        }
      }
      this.filterToDefaultView();
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = this.router.routerState.snapshot.url;

      this.setFilter(url);
    });

    this.setFilter(this.router.routerState.snapshot.url);

    this.reviewCountInterval = setInterval(() => {
      this.reviewCountLoad();
    }, 120 * 1000);

  }

  setFilter(url: string) {
    if (url.includes('/feed')) {
      if (url.includes('/image')) {
        this.filter = 'image';
      } else if (url.includes('/video')) {
        this.filter = 'video';
      } else {
        this.filter = 'activity';
      }
    }
  }

  ngOnDestroy() {
    this.paramsSubscription.unsubscribe();
    this.childParamsSubscription.unsubscribe();
    this.unlistenForNewMessages();
    this.leaveCommentsSocketRoom();

    if (this.reviewCountInterval) {
      clearInterval(this.reviewCountInterval);
    }
  }

  load() {
    this.updateMarkers.markAsRead({
      entity_guid: this.guid,
      entity_type: 'group',
      marker: 'activity'
    });

    this.updateMarkers.markAsRead({
      entity_guid: this.guid,
      entity_type: 'group',
      marker: 'conversation'
    });

    return this.service.load(this.guid)
      .then((group) => {
        this.group = group;
        this.joinCommentsSocketRoom();
        this.title.setTitle(this.group.name);
        this.context.set('activity', { label: this.group.name, nameLabel: this.group.name, id: this.group.guid });
        if (this.session.getLoggedInUser()) {
          this.addRecent();
        }
      });
  }

  async reviewCountLoad() {
    if (!this.guid) {
      return;
    }

    let count = 0;

    try {
      count = await this.service.getReviewCount(this.guid);
    } catch (e) {
    }

    this.group['adminqueue:count'] = count;
  }

  addRecent() {
    if (!this.group) {
      return;
    }
    this.recent
      .store('recent', this.group, (entry) => entry.guid == this.group.guid)
      .splice('recent', 50);
  }

  filterToDefaultView() {
    if (!this.group || this.route.snapshot.params.filter && this.route.snapshot.params.filter !== 'gathering') {
      return;
    }

    if (this.filter === 'gathering') {
      this.videochat.activate(this.group);
    }

    switch (this.group.default_view) {
      case 1:
        this.filter = 'conversation';
        break;
    }
  }

  save() {
    this.group.videoChatDisabled = parseInt(this.group.videoChatDisabled);

    this.service.save({
      guid: this.group.guid,
      name: this.group.name,
      briefdescription: this.group.briefdescription,
      tags: this.group.tags,
      membership: this.group.membership,
      moderated: this.group.moderated,
      default_view: this.group.default_view,
      videoChatDisabled: this.group.videoChatDisabled,
    });

    this.editing = false;
    this.editDone = true;
    this.detectChanges();
  }

  toggleEdit() {
    this.editing = !this.editing;

    if (this.editing) {
      this.editDone = false;
    }
  }

  add_banner(file: any) {
    this.service.upload({
      guid: this.group.guid,
      banner_position: file.top
    }, { banner: file.file });

    this.group.banner = true;
  }

  upload_avatar(file: any) {
    this.service.upload({
      guid: this.group.guid
    }, { avatar: file });
  }

  change_membership(membership: any) {
    this.load();
  }

  canDeactivate() {
    if (!this.feed)
      return true;
    return this.feed.canDeactivate();
  }

  joinCommentsSocketRoom(keepAlive: boolean = false) {
    if (!keepAlive && this.socketRoomName) {
      this.leaveCommentsSocketRoom();
    }

    if (!this.group || !this.group.guid || !this.group['is:member']) {
      return;
    }

    // TODO: Only join if a member

    this.socketRoomName = `comments:${this.group.guid}`;
    this.sockets.join(this.socketRoomName);
  }

  leaveCommentsSocketRoom() {
    if (!this.socketRoomName) {
      return;
    }

    this.sockets.leave(this.socketRoomName);
  }

  listenForNewMessages() {
    this.socketSubscription = this.sockets.subscribe('comment', (parent_guid, owner_guid, guid) => {
      if (!this.group || parent_guid !== this.group.guid) {
        return;
      }

      this.group['comments:count']++;

      if (this.filter != 'conversation') {
        this.newConversationMessages = true;
      }
    });
  }

  unlistenForNewMessages() {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }

  async findTrendingHashtags(searchText: string) {
    const response: any = await this.client.get('api/v2/search/suggest/tags', { q: searchText });
    return response.tags
      .filter(item => item.toLowerCase().includes(searchText.toLowerCase()))
      .slice(0, 5);
  }

  getChoiceLabel(text: string) {
    return `#${text}`;
  }

  onTagsChange(tags) {
  }

  onTagsAdded(tags) {
    if (!this.group.tags)
      this.group.tags = [];

    for (let tag of tags) {
      this.group.tags.push(tag.value);
    }
  }

  onTagsRemoved(tags) {
    for (let tag of tags) {
      for (let i in this.group.tags) {
        console.log(this.group.tags[i]);
        if (this.group.tags[i] == tag.value) {
          this.group.tags.splice(i, 1);
        }
      }
    }
  }

  onOptionsChange(options) {
    this.editing = options.editing;
    if (options.editing === false)
      this.save();
  }

  @HostListener('window:resize') detectWidth() {
    this.showRight = window.innerWidth > 900;
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }

}
