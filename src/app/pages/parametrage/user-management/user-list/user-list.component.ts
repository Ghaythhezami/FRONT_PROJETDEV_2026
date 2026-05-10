import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AuthUser } from '../../../../shared/services/auth.models';
import { UserManagementService } from '../../../../shared/services/user-management.service';
import { RegisterUserDto, UpdateUserDto } from '../../../../shared/services/user-management.models';
import { UserFormComponent } from '../user-form/user-form.component';

@Component({
  selector: 'app-user-list',
  imports: [CommonModule, UserFormComponent],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly userManagementService = inject(UserManagementService);

  users: AuthUser[] = [];
  selectedUser: AuthUser | null = null;
  showForm = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  formErrorMessage = '';

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';

    this.userManagementService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ?? error?.message ?? 'Unable to load users.';
        this.isLoading = false;
      },
    });
  }

  openCreateForm() {
    this.selectedUser = null;
    this.formErrorMessage = '';
    this.showForm = true;
  }

  openEditForm(user: AuthUser) {
    this.selectedUser = user;
    this.formErrorMessage = '';
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedUser = null;
    this.formErrorMessage = '';
  }

  createUser(user: RegisterUserDto) {
    this.isSaving = true;
    this.formErrorMessage = '';

    this.userManagementService.createUser(user).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.loadUsers();
      },
      error: (error) => {
        this.formErrorMessage =
          error?.error?.message ?? error?.message ?? 'Unable to create user.';
        this.isSaving = false;
      },
    });
  }

  updateUser(user: UpdateUserDto) {
    this.isSaving = true;
    this.formErrorMessage = '';

    this.userManagementService.updateUser(user).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.loadUsers();
      },
      error: (error) => {
        this.formErrorMessage =
          error?.error?.message ??
          error?.message ??
          'Unable to update user. Please confirm the backend exposes a user update endpoint.';
        this.isSaving = false;
      },
    });
  }

  initials(user: AuthUser): string {
    const firstInitial = user.prenom?.charAt(0) ?? '';
    const lastInitial = user.nom?.charAt(0) ?? '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
  }
}
