import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { ProChannelService } from "../channel.service";
import { Router } from "@angular/router";
import { MindsUser } from "../../../../interfaces/entities";

@Component({
  selector: 'm-pro--channel--categories',
  template: `
    <div
      class="m-proChannel__category"
      [class.m-proChannel__selectedCategory]="!!tag.selected"
      (click)="selectTag(tag)"
      *ngFor="let tag of channel.pro_settings.tag_list"
    >
      {{tag.label}}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class ProCategoriesComponent {

  @Input() type: string;
  @Input() params: any = {};

  get channel(): MindsUser {
    return this.channelService.currentChannel;
  }

  get currentURL(): string {
    return `pro/${this.channel.username}/${this.type}`
  }

  constructor(
    protected channelService: ProChannelService,
    protected router: Router,
    protected cd: ChangeDetectorRef,
  ) {
  }

  selectTag(clickedTag: any) {
    for (let tag of this.channel.pro_settings.tag_list) {
      tag.selected = tag.tag == clickedTag.tag;
    }

    const params = {
      ...this.params
    };

    if (clickedTag.tag === 'all') {
      delete params.hashtag;
    } else {
      params.hashtag = clickedTag.tag;
    }

    this.router.navigate([this.currentURL, params]);

    this.detectChanges();
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }
}
