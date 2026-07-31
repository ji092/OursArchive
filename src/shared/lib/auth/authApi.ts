import { supabase } from '@/shared/lib/api/supabaseClient';
import type { MembershipRole } from '@/shared/lib/rbac/permissions';

// OAuth 자가가입 + Master 승인 플로우 (backend/migrations/0005_oauth_signup.sql 짝).
// 카카오 로그인 → membership 행이 없으면 join_message와 함께 pending 요청을 만들고,
// Master가 관리 페이지에서 승인(role 지정 + status: active)할 때까지 대기한다.
// 구글 로그인은 사용하지 않는다 (2026-07-28 사용자 지정 — 카카오 단일 지원).
type MembershipStatus = 'active' | 'invited' | 'pending';

export interface MyMembership {
  id: string;
  workspaceId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinMessage: string | null;
}

export async function signInWithKakao() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${window.location.origin}/login` },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchMyMembership(userId: string): Promise<MyMembership | null> {
  const { data, error } = await supabase
    .from('membership')
    .select('id, workspace_id, role, status, join_message')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    role: data.role,
    status: data.status,
    joinMessage: data.join_message,
  };
}

export async function submitJoinRequest(userId: string, joinMessage: string): Promise<void> {
  const { data: workspaceId, error: workspaceError } = await supabase.rpc('get_default_workspace_id');
  if (workspaceError) throw workspaceError;

  const { error } = await supabase.from('membership').insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: 'guest',
    status: 'pending',
    join_message: joinMessage,
  });
  if (error) throw error;
}
