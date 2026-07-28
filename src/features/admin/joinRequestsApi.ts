import { supabase } from '@/shared/lib/api/supabaseClient';
import type { MemberRole } from './types';

// OAuth 자가가입(backend/migrations/0005_oauth_signup.sql)으로 생긴 pending membership 행을
// Master가 검토·승인하는 화면용 데이터 계층. 기존 features/admin/api.ts(초대 목록, localStorage
// 목데이터)와 달리 이건 실제 Supabase membership 테이블을 그대로 쓴다 — 로그인 화면이 실제로
// 이 테이블에 pending 요청을 쓰고 있어서(src/pages/auth/LoginPage.tsx), 여기도 실데이터로 맞춘다.
export interface JoinRequest {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  joinMessage: string | null;
  requestedAt: string;
}

export async function fetchJoinRequests(): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('membership')
    .select('id, user_id, join_message, created_at, profiles(name, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      name: profile?.name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      joinMessage: row.join_message,
      requestedAt: row.created_at,
    };
  });
}

export async function approveJoinRequest(id: string, role: Exclude<MemberRole, 'master'>): Promise<void> {
  const { error } = await supabase.from('membership').update({ role, status: 'active' }).eq('id', id);
  if (error) throw error;
}

export async function rejectJoinRequest(id: string): Promise<void> {
  const { error } = await supabase.from('membership').delete().eq('id', id);
  if (error) throw error;
}
