import { supabase } from '@/shared/lib/api/supabaseClient';
import type { Member, MemberRole } from './types';

// joinRequestsApi.ts와 동일하게 실제 Supabase membership/profiles를 쓴다. 가입은 카카오 OAuth
// 자가가입 + Master 승인뿐이라(2026-07-30 확정, 이메일 초대 폐지) 여기서는 활성 멤버만 다룬다.
// 승인 대기 중인 사람은 joinRequestsApi.ts가 별도로 보여준다. RLS(membership_select: user_id=본인
// or is_master(workspace_id))가 이미 "내 워크스페이스"로 걸러주므로 여기서 workspace_id 필터를 다시 걸 필요는 없다.
export async function fetchMembers(): Promise<Member[]> {
  const { data: memberships, error } = await supabase
    .from('membership')
    .select('id, role, status, relation_label, user_id, profiles!membership_user_id_fkey(nickname, name)')
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (memberships ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      name: profile?.nickname ?? profile?.name ?? '이름없음',
      relationLabel: m.relation_label ?? (m.role === 'master' ? '본인 (Master)' : ''),
      role: m.role,
    };
  });
}

export async function updateMemberRole(id: string, role: MemberRole): Promise<void> {
  const { error } = await supabase.from('membership').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from('membership').delete().eq('id', id);
  if (error) throw error;
}
