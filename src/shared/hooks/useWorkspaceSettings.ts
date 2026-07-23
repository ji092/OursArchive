import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWorkspaceSettings, updateWorkspaceSettings } from '@/shared/lib/workspace/workspaceSettingsApi';

export const workspaceSettingsQueryKey = ['workspace-settings'] as const;

export function useWorkspaceSettings() {
  return useQuery({ queryKey: workspaceSettingsQueryKey, queryFn: fetchWorkspaceSettings });
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkspaceSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceSettingsQueryKey }),
  });
}
