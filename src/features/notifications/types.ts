// backend/migrations/0007_notifications.sql의 notification 테이블과 짝을 맞춘 프론트 타입.
export type NotificationType = 'new_post' | 'new_comment' | 'schedule' | 'role_changed';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  meta: string | null;
  createdAt: string;
  readAt: string | null;
}
