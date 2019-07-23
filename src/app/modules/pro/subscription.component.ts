import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Session } from '../../services/session';
import { ProService } from './pro.service';

@Component({
  selector: 'm-pro--subscription',
  templateUrl: 'subscription.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProSubscriptionComponent implements OnInit {

  isLoggedIn: boolean = false;

  inProgress: boolean = false;

  active: boolean;

  criticalError: boolean = false;

  error: string = '';

  constructor(
    protected service: ProService,
    protected session: Session,
    protected cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    this.isLoggedIn = this.session.isLoggedIn();

    if (this.isLoggedIn) {
      this.load();
    }
  }

  async load() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      this.active = await this.service.isActive();
    } catch (e) {
      this.criticalError = true;
      this.error = (e && e.message) || 'Unknown error';
    }

    this.inProgress = false;
    this.detectChanges();
  }

  async enable() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      await this.service.enable();
      this.active = true;
    } catch (e) {
      this.active = false;
      this.error = (e && e.message) || 'Unknown error';
    }

    this.inProgress = false;
    this.detectChanges();
  }

  async disable() {
    this.inProgress = true;
    this.error = '';
    this.detectChanges();

    try {
      await this.service.disable();
      this.active = false;
    } catch (e) {
      this.active = true;
      this.error = (e && e.message) || 'Unknown error';
    }

    this.inProgress = false;
    this.detectChanges();
  }

  detectChanges() {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }
}
