import { useQuery } from '@tanstack/react-query';
import { fetchLoveRecords } from '../api';

export const loveRecordsQueryKey = ['love-records'] as const;

export function useLoveRecords() {
  return useQuery({
    queryKey: loveRecordsQueryKey,
    queryFn: fetchLoveRecords,
  });
}
