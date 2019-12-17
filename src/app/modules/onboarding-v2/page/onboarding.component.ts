import { Component, OnInit } from '@angular/core';
import { Session } from '../../../services/session';
import { Router } from '@angular/router';
import { Storage } from '../../../services/storage';

@Component({
  selector: 'm-onboarding',
  templateUrl: 'onboarding.component.html',
})
export class OnboardingComponent implements OnInit {
  constructor(
    private session: Session,
    private router: Router,
    private storage: Storage
  ) {}

  ngOnInit() {
    if (!this.session.isLoggedIn()) {
      this.storage.set('redirect', 'onboarding');
      this.router.navigate(['/register']);
    }
  }
}
