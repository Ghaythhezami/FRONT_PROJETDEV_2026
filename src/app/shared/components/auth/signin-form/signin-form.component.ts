
import { Component } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signin-form',
  imports: [
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
],
  templateUrl: './signin-form.component.html',
  styles: ``
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSignIn() {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.isLoading = true;

    this.authService.login(this.email, this.password, this.isChecked).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/');
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ?? error?.message ?? 'Sign in failed. Please check your credentials.';
      },
    });
  }
}
