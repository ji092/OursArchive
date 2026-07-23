import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLoveRecord } from '../api';
import { loveRecordsQueryKey } from './useLoveRecords';

export function useCreateLoveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoveRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey });
    },
  });
}
