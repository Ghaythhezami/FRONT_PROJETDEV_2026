import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../shared/components/data/load-more-footer/load-more-footer.component';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { InfiniteSelectComponent, SelectOption } from '../../../shared/components/data/infinite-select/infinite-select.component';
import { NotificationResponse } from '../../../shared/services/notification.models';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../shared/services/auth.service';
import { UserDirectoryService } from '../../../shared/services/user-directory.service';
import { PaginatedListStore } from '../../../shared/stores/paginated-list.store';
import {
  AppCardComponent,
  FormFieldComponent,
  FormTextareaComponent,
  ToastService,
  UiButtonComponent,
} from '../../../shared/ui';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
    InfiniteSelectComponent,
    AppCardComponent,
    UiButtonComponent,
    FormFieldComponent,
    FormTextareaComponent,
  ],
  templateUrl: './notifications-page.component.html',
})
export class NotificationsPageComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  readonly store = new PaginatedListStore<NotificationResponse>((query) =>
    this.notificationService.getMinePaged(query),
  );

  userSelectOptions = signal<SelectOption[]>([]);
  userSelectLoading = signal(false);

  sendForm = { receiverId: '', description: '', link: '' };
  testForm = { receiverId: '', description: '' };

  ngOnInit(): void {
    this.store.loadFirst();
    if (this.authService.isAdmin()) {
      this.loadUserOptions('');
    }
  }

  loadUserOptions(search: string): void {
    this.userSelectLoading.set(true);
    this.userDirectory.searchUsers({ page: 1, limit: 10, search }).subscribe({
      next: (result) => {
        this.userSelectOptions.set(
          result.items.map((u) => ({
            value: u.userId,
            label: `${u.prenom} ${u.nom}`.trim() || u.email,
            sublabel: u.email,
          })),
        );
        this.userSelectLoading.set(false);
      },
      error: () => this.userSelectLoading.set(false),
    });
  }

  markRead(n: NotificationResponse): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.notificationId).subscribe({
        next: () => this.toast.success('Marked as read.'),
      });
    }
  }

  sendNotification(): void {
    if (!this.sendForm.receiverId) {
      this.toast.warning('Select a recipient.');
      return;
    }
    this.notificationService.send({
      ReceiverId: this.sendForm.receiverId,
      Description: this.sendForm.description,
      Link: this.sendForm.link,
    }).subscribe({
      next: () => {
        this.toast.success('Notification sent.');
        this.sendForm = { receiverId: '', description: '', link: '' };
        this.store.loadFirst();
      },
      error: (e) => this.toast.error(e?.message ?? 'Send failed.'),
    });
  }

  sendTest(): void {
    if (!this.testForm.receiverId) {
      this.toast.warning('Select a recipient.');
      return;
    }
    this.notificationService.sendTest({
      ReceiverId: this.testForm.receiverId,
      Description: this.testForm.description,
    }).subscribe({
      next: () => {
        this.toast.success('Test notification sent.');
        this.testForm = { receiverId: '', description: '' };
      },
      error: (e) => this.toast.error(e?.message ?? 'Test failed.'),
    });
  }
}
