import { useQuery } from '@tanstack/react-query';
import { fetchLovePlans } from '../api';

export const lovePlansQueryKey = (workspaceId: string) => ['love-plans', workspaceId] as const;

export function useLovePlans(workspaceId: string | undefined) {
  return useQuery({
    queryKey: lovePlansQueryKey(workspaceId ?? ''),
    queryFn: () => fetchLovePlans(workspaceId!),
    enabled: !!workspaceId,
  });
}
