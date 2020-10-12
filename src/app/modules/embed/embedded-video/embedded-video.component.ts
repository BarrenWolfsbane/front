import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'm-embedded-video',
  templateUrl: './embedded-video.component.html',
})
export class EmbeddedVideoComponent implements OnInit {
  guid: string;
  autoplay: boolean = true;
  paramsSubscription: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.paramsSubscription = this.activatedRoute.paramMap.subscribe(params => {
      this.guid = params.get('guid');
      this.detectChanges();
    });
  }

  public ngOnDestroy() {
    this.paramsSubscription.unsubscribe();
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }
}
