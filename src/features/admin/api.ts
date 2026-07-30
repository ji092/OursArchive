import { supabase } from '@/shared/lib/api/supabaseClient';
import type { Member, MemberRole } from './types';

// joinRequestsApi.ts와 동일하게 실제 Supabase membership/profiles/invite_token을 쓴다.
// 활성 멤버는 membership(status='active'), 초대 대기는 invite_token(status='active', 아직 미사용)에서 가져와 합친다.
// RLS(membership_select: user_id=본인 or is_master(workspace_id))가 이미 "내 워크스페이스"로
// 걸러주므로 여기서 workspace_id 필터를 다시 걸 필요는 없다(select 기준) — insert만 필요.
export async function fetchMembers(): Promise<Member[]> {
  const { data: memberships, error } = await supabase
    .from('membership')
    .select('id, role, status, relation_label, user_id, profiles!membership_user_id_fkey(nickname, name)')
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const active: Member[] = (memberships ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      name: profile?.nickname ?? profile?.name ?? '이름없음',
      relationLabel: m.relation_label ?? (m.role === 'master' ? '본인 (Master)' : ''),
      role: m.role,
      status: 'active',
    };
  });

  const { data: invites, error: inviteError } = await supabase
    .from('invite_token')
    .select('id, email, role')
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (inviteError) throw inviteError;

  const invited: Member[] = (invites ?? []).map((invite) => ({
    id: invite.id,
    name: invite.email.split('@')[0],
    email: invite.email,
    relationLabel: '초대 대기',
    role: invite.role,
    status: 'invited',
  }));

  return [...active, ...invited];
}

export interface InviteMemberInput {
  workspaceId: string;
  email: string;
  role: Exclude<MemberRole, 'master'>;
}

// invite-issue Edge Function(backend/functions/invite-issue) 실제 호출 — 토큰 발급/이메일 발송은
// 전부 서버측에서 처리한다(원문 토큰은 이메일로만 나가고 DB엔 해시만 남음, CLAUDE.md 7.4/7.5).
export async function inviteMember(input: InviteMemberInput): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-issue', {
    body: { workspace_id: input.workspaceId, email: input.email, role: input.role },
  });
  if (error) throw error;
}

export async function updateMemberRole(id: string, role: MemberRole): Promise<void> {
  const { error } = await supabase.from('membership').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from('membership').delete().eq('id', id);
  if (error) throw error;
}
