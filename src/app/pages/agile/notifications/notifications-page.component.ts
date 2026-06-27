import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../shared/components/data/load-more-footer/load-more-footer.component';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { NotificationResponse } from '../../../shared/services/notification.models';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../shared/services/auth.service';
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
    AppCardComponent,
    UiButtonComponent,
    FormFieldComponent,
    FormTextareaComponent,
  ],
  templateUrl: './notifications-page.component.html',
})
export class NotificationsPageComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  readonly store = new PaginatedListStore<NotificationResponse>((query) =>
    this.notificationService.getMinePaged(query),
  );

  sendForm = { receiverId: '', description: '', link: '' };
  testForm = { receiverId: '', description: '' };

  ngOnInit(): void {
    this.store.loadFirst();
  }

  markRead(n: NotificationResponse): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.notificationId).subscribe({
        next: () => this.toast.success('Marked as read.'),
      });
    }
  }

  sendNotification(): void {
    this.notificationService.send({
      ReceiverId: this.sendForm.receiverId,
      Description: this.sendForm.description,
      Link: this.sendForm.link,
    }).subscribe({
      next: () => {
        this.toast.success('Notification sent.');
        this.store.loadFirst();
      },
      error: (e) => this.toast.error(e?.message ?? 'Send failed.'),
    });
  }

  sendTest(): void {
    this.notificationService.sendTest({
      ReceiverId: this.testForm.receiverId,
      Description: this.testForm.description,
    }).subscribe({
      next: () => this.toast.success('Test notification sent.'),
      error: (e) => this.toast.error(e?.message ?? 'Test failed.'),
    });
  }
}
