import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLoveRecord, deleteLoveRecord, updateLoveRecord } from '../api';
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

export function useUpdateLoveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLoveRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey });
    },
  });
}

export function useDeleteLoveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLoveRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey });
    },
  });
}
