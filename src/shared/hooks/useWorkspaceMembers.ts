import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/api/supabaseClient';

export interface WorkspaceMember {
  id: string; // profiles.id (= membership.user_id)
  name: string;
}

// 결혼 담당자 선택, 결혼 업체연락처 등 "워크스페이스 활성 멤버 이름 목록"이 필요한 여러 챕터가
// 공유한다 (챕터 간 직접 import 금지 — CLAUDE.md). admin 기능의 더 상세한 멤버 목록과는 별도.
async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('membership')
    .select('user_id, status, profiles(nickname, name)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.user_id, name: profile?.nickname ?? profile?.name ?? '이름없음' };
  });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId ?? ''],
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}
