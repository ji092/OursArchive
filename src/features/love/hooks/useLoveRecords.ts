import { useQuery } from '@tanstack/react-query';
import { fetchLoveRecords } from '../api';

export const loveRecordsQueryKey = (workspaceId: string) => ['love-records', workspaceId] as const;

export function useLoveRecords(workspaceId: string | undefined) {
  return useQuery({
    queryKey: loveRecordsQueryKey(workspaceId ?? ''),
    queryFn: () => fetchLoveRecords(workspaceId!),
    enabled: !!workspaceId,
  });
}
