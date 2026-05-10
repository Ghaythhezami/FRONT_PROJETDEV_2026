import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component';
import { BoardSignalrService } from '../../../services/board-signalr.service';
import { NotificationResponse } from '../../../services/notification.models';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemComponent]
})
export class NotificationDropdownComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly boardSignalrService = inject(BoardSignalrService);
  private readonly router = inject(Router);

  isOpen = false;
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly isLoading = this.notificationService.isLoading;
  readonly error = this.notificationService.error;

  ngOnInit() {
    this.notificationService.loadMine().subscribe();
    this.boardSignalrService.start();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  onNotificationClick(notification: NotificationResponse) {
    this.notificationService.markAsRead(notification.notificationId).subscribe();
    this.closeDropdown();

    if (!notification.link) {
      return;
    }

    if (/^https?:\/\//i.test(notification.link)) {
      window.location.href = notification.link;
      return;
    }

    this.router.navigateByUrl(notification.link);
  }

  formatTime(createdAt: string): string {
    const createdDate = new Date(createdAt);
    const diffMs = Date.now() - createdDate.getTime();

    if (Number.isNaN(diffMs)) {
      return '';
    }

    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours} hr ago`;
    }

    return createdDate.toLocaleDateString();
  }
}
