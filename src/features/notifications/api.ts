import { supabase } from '@/shared/lib/api/supabaseClient';
import type { AppNotification } from './types';

// role별 발송 대상 분기는 backend/migrations/0007_notifications.sql의 트리거(notify_roles)가
// 서버 한 곳에서만 처리한다 — 여기선 내 앞으로 이미 만들어진 행을 그대로 읽기만 한다.
export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notification')
    .select('id, type, title, meta, created_at, read_at')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    meta: row.meta,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notification').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
