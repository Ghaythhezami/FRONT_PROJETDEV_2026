import { Component, inject } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { DEFAULT_SIGNUP_ROLE } from '../../../config/api.config';
import { RegisterUserDto } from '../../../services/user-management.models';

@Component({
  selector: 'app-signup-form',
  imports: [LabelComponent, CheckboxComponent, InputFieldComponent, RouterModule, FormsModule],
  templateUrl: './signup-form.component.html',
})
export class SignupFormComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  showPassword = false;
  isChecked = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  fname = '';
  lname = '';
  email = '';
  password = '';
  telephone = '';
  filiale = '';

  readonly defaultRole = DEFAULT_SIGNUP_ROLE;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSignUp(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.fname.trim() || !this.lname.trim() || !this.email.trim() || !this.password) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    if (!this.isChecked) {
      this.errorMessage = 'Please accept the terms to create an account.';
      return;
    }

    const payload: RegisterUserDto = {
      Nom: this.lname.trim(),
      Prenom: this.fname.trim(),
      Email: this.email.trim(),
      MotDePasse: this.password,
      Role: this.defaultRole,
      Telephone: this.telephone.trim() || undefined,
      Filiale: this.filiale.trim() || undefined,
    };

    this.isLoading = true;

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Account created. You can sign in now.';
        setTimeout(() => this.router.navigate(['/signin'], { queryParams: { email: this.email } }), 1200);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.message ??
          error?.error?.title ??
          error?.message ??
          'Sign up failed. Check your details or try another email.';
      },
    });
  }
}
