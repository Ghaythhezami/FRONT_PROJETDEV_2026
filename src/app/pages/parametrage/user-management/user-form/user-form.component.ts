import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthUser } from '../../../../shared/services/auth.models';
import { RegisterUserDto, UpdateUserDto } from '../../../../shared/services/user-management.models';

type UserFormModel = {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  role: string;
  filiale: string;
};

@Component({
  selector: 'app-user-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  private readonly selectedUserSignal = signal<AuthUser | null>(null);

  @Input() set selectedUser(user: AuthUser | null) {
    this.selectedUserSignal.set(user);
    this.form = this.toFormModel(user);
  }

  @Input() isSaving = false;
  @Input() errorMessage = '';
  @Output() cancel = new EventEmitter<void>();
  @Output() createUser = new EventEmitter<RegisterUserDto>();
  @Output() updateUser = new EventEmitter<UpdateUserDto>();

  readonly isEditing = computed(() => !!this.selectedUserSignal());
  readonly roles = ['admin', 'po', 'scrum master', 'developer', 'tester', 'analyste'];

  form: UserFormModel = this.toFormModel(null);

  submit() {
    const selectedUser = this.selectedUserSignal();

    if (selectedUser) {
      const update: UpdateUserDto = {
        UserId: selectedUser.userId,
        Nom: this.form.nom.trim(),
        Prenom: this.form.prenom.trim(),
        Email: this.form.email.trim(),
        Telephone: this.form.telephone.trim(),
        Role: this.form.role,
        Filiale: this.form.filiale.trim(),
      };

      if (this.form.password.trim()) {
        update.MotDePasse = this.form.password.trim();
      }

      this.updateUser.emit(update);
      return;
    }

    this.createUser.emit({
      Nom: this.form.nom.trim(),
      Prenom: this.form.prenom.trim(),
      Email: this.form.email.trim(),
      MotDePasse: this.form.password.trim(),
      Telephone: this.form.telephone.trim(),
      Role: this.form.role,
      Filiale: this.form.filiale.trim(),
    });
  }

  private toFormModel(user: AuthUser | null): UserFormModel {
    return {
      nom: user?.nom ?? '',
      prenom: user?.prenom ?? '',
      email: user?.email ?? '',
      password: '',
      telephone: user?.telephone ?? '',
      role: user?.role || 'developer',
      filiale: user?.filiale ?? '',
    };
  }
}
