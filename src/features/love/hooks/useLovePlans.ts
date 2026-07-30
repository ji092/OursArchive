import { useQuery } from '@tanstack/react-query';
import { fetchLovePlans } from '../api';

export function useLovePlans(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['love-plans', workspaceId ?? ''],
    queryFn: () => fetchLovePlans(workspaceId!),
    enabled: !!workspaceId,
  });
}
