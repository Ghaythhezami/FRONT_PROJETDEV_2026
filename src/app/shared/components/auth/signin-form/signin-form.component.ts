import { Component } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UiButtonComponent } from '../../../ui/button/ui-button.component';

@Component({
  selector: 'app-signin-form',
  imports: [
    LabelComponent,
    CheckboxComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule,
    UiButtonComponent,
  ],
  templateUrl: './signin-form.component.html',
  styles: `
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .signin-animate {
      animation: fade-up 0.5s ease-out both;
    }
  `,
})
export class SigninFormComponent {
  showPassword = false;
  isChecked = false;
  isLoading = false;
  errorMessage = '';

  email = '';
  password = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    const prefillEmail = this.route.snapshot.queryParamMap.get('email');
    if (prefillEmail) {
      this.email = prefillEmail;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSignIn(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';

    if (!this.email?.trim() || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.isLoading = true;

    this.authService
      .login(this.email.trim(), this.password, this.isChecked)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
          this.authService.bootstrapRealtimeServices();
          void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
        },
        error: (error) => {
          const status = error?.status;
          if (status === 504 || status === 503 || status === 0) {
            this.errorMessage =
              'The server is waking up (Render free tier). Wait a moment and try again.';
            return;
          }
          this.errorMessage =
            error?.error?.message ?? error?.message ?? 'Sign in failed. Please check your credentials.';
        },
      });
  }
}
