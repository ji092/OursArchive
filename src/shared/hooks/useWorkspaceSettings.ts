import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWorkspaceSettings, updateWorkspaceSettings, type WorkspaceSettings } from '@/shared/lib/workspace/workspaceSettingsApi';
import { useCurrentWorkspaceId } from './useAuth';

// 호출부(대시보드/연애/결혼/임신)가 workspaceId를 몰라도 되도록 여기서 useCurrentWorkspaceId로
// 직접 resolve한다 — 기존 무인자 훅 시그니처를 그대로 유지해 컴포넌트 변경을 최소화했다.
function workspaceSettingsQueryKey(workspaceId: string) {
  return ['workspace-settings', workspaceId] as const;
}

export function useWorkspaceSettings() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: workspaceSettingsQueryKey(workspaceId ?? ''),
    queryFn: () => fetchWorkspaceSettings(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useUpdateWorkspaceSettings() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: WorkspaceSettings) => updateWorkspaceSettings(workspaceId!, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceSettingsQueryKey(workspaceId ?? '') }),
  });
}
