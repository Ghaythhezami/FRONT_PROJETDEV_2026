import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AuthUser } from '../../../../shared/services/auth.models';
import { UserManagementService } from '../../../../shared/services/user-management.service';
import { RegisterUserDto, UpdateUserDto } from '../../../../shared/services/user-management.models';
import { UserFormComponent } from '../user-form/user-form.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';

@Component({
  selector: 'app-user-list',
  imports: [
    CommonModule,
    UserFormComponent,
    SearchToolbarComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
    PageBreadcrumbComponent,
  ],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly userManagementService = inject(UserManagementService);

  readonly store = new PaginatedListStore<AuthUser>((query) =>
    this.userManagementService.getUsersPaged(query),
  );

  selectedUser: AuthUser | null = null;
  showForm = false;
  isSaving = false;
  formErrorMessage = '';

  ngOnInit(): void {
    this.store.loadFirst();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  openCreateForm(): void {
    this.selectedUser = null;
    this.formErrorMessage = '';
    this.showForm = true;
  }

  openEditForm(user: AuthUser): void {
    this.selectedUser = user;
    this.formErrorMessage = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedUser = null;
    this.formErrorMessage = '';
  }

  createUser(user: RegisterUserDto): void {
    this.isSaving = true;
    this.formErrorMessage = '';

    this.userManagementService.createUser(user).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.store.loadFirst();
      },
      error: (error) => {
        this.formErrorMessage =
          error?.error?.message ?? error?.message ?? 'Unable to create user.';
        this.isSaving = false;
      },
    });
  }

  updateUser(user: UpdateUserDto): void {
    this.isSaving = true;
    this.formErrorMessage = '';

    this.userManagementService.updateUser(user).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.store.loadFirst();
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
