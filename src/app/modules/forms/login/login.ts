import { Component, EventEmitter, Input, NgZone, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

import { Client } from '../../../services/api';
import { Session } from '../../../services/session';
import { UserAvatarService } from '../../../common/services/user-avatar.service';
import { FormToastService } from '../../../common/services/form-toast.service';

@Component({
  moduleId: module.id,
  selector: 'minds-form-login',
  templateUrl: 'login.html',
})
export class LoginForm {
  @Input() showBigButton: boolean = false;
  @Input() showInlineErrors: boolean = false;
  @Input() showTitle: boolean = false;
  @Input() showLabels: boolean = false;
  @Output() done: EventEmitter<any> = new EventEmitter();
  @Output() doneRegistered: EventEmitter<any> = new EventEmitter();

  errorMessage: string = '';
  twofactorToken: string = '';
  hideLogin: boolean = false;
  inProgress: boolean = false;
  referrer: string;

  usernameError: string;

  form: FormGroup;

  errorDisplays: any = {
    'LoginException::AttemptsExceeded':
      'You have exceeded your login attempts. Please try again in a few minutes.',
    'LoginException::DisabledUser': 'This account has been disabled',
    'LoginException::AuthenticationFailed':
      'Incorrect username/password. Please try again.',
    'LoginException::AccountLocked': 'Account locked',
    'LoginException:BannedUser': 'You are not allowed to login.',
    'LoginException::CodeVerificationFailed':
      "Sorry, we couldn't verify your two factor code. Please try logging again.",
    'LoginException::InvalidToken': 'Invalid token',
    'LoginException::Unknown': 'Sorry, there was an error. Please try again.',
  };

  // Taken from advice in https://stackoverflow.com/a/1373724
  private emailRegex: RegExp = new RegExp(
    "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
  );

  constructor(
    public session: Session,
    public client: Client,
    fb: FormBuilder,
    private zone: NgZone,
    private userAvatarService: UserAvatarService,
    protected formToastService: FormToastService
  ) {
    this.form = fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  login() {
    if (this.inProgress) {
      return;
    }

    this.usernameError = null;

    const username = this.form.value.username.trim();

    if (username === '') {
      if (this.showInlineErrors) {
        this.usernameError = 'LoginException::UsernameRequired';
      } else {
        this.errorMessage = 'LoginException::UsernameRequired';
      }
      return;
    }

    if (this.emailRegex.test(username)) {
      if (this.showInlineErrors) {
        this.usernameError = 'LoginException::EmailAddress';
      } else {
        this.errorMessage = 'LoginException::EmailAddress';
      }
      return;
    }

    // re-enable cookies
    document.cookie =
      'disabled_cookies=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    this.errorMessage = '';
    this.inProgress = true;

    const opts = {
      username: username,
      password: this.form.value.password,
    };

    this.client
      .post('api/v1/authenticate', opts)
      .then((data: any) => {
        // TODO: [emi/sprint/bison] Find a way to reset controls. Old implementation throws Exception;
        this.inProgress = false;
        this.session.login(data.user);
        this.userAvatarService.init();
        this.done.next(data.user);
      })
      .catch(e => {
        this.inProgress = false;

        if (!e) {
          this.showToastError('LoginException::Unknown');
          this.session.logout();
        } else if (e.status === 'failed') {
          // incorrect login details
          this.showToastError('LoginException::AuthenticationFailed');
          this.session.logout();
        } else if (e.status === 'error') {
          if (
            e.message === 'LoginException:BannedUser' ||
            e.message === 'LoginException::AttemptsExceeded'
          ) {
            this.session.logout();
          }

          // two factor?
          this.twofactorToken = e.message;
          this.hideLogin = true;
        } else {
          this.showToastError('LoginException::Unknown');
        }
      });
  }

  twofactorAuth(code) {
    this.client
      .post('api/v1/twofactor/authenticate', {
        token: this.twofactorToken,
        code: code.value,
      })
      .then((data: any) => {
        this.session.login(data.user);
        this.userAvatarService.init();
        this.done.next(data.user);
      })
      .catch(e => {
        this.showToastError(e.message);
        this.twofactorToken = '';
        this.hideLogin = false;
      });
  }

  showToastError(errorMessage: string): void {
    this.errorMessage = errorMessage;
    this.formToastService.error(this.errorDisplays[this.errorMessage]);
  }
}
