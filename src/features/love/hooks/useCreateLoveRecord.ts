import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLoveRecord, deleteLoveRecord, updateLoveRecord } from '../api';
import { loveRecordsQueryKey } from './useLoveRecords';

export function useCreateLoveRecord(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoveRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey(workspaceId ?? '') }),
  });
}

export function useUpdateLoveRecord(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLoveRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteLoveRecord(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLoveRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey(workspaceId ?? '') }),
  });
}
