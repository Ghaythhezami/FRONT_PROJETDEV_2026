export interface NotificationResponseDto {
  NotificationId?: string;
  Message?: string;
  Link?: string;
  IsRead?: boolean;
  CreatedAt?: string;
  ReceiverId?: string | null;
  notificationId?: string;
  message?: string;
  link?: string;
  isRead?: boolean;
  createdAt?: string;
  receiverId?: string | null;
}

export interface NotificationResponse {
  notificationId: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  receiverId: string | null;
}
