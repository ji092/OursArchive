import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addLoveComment, deleteLoveComment } from '../api';
import { loveRecordsQueryKey } from './useLoveRecords';

export function useAddLoveComment(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addLoveComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteLoveComment(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLoveComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveRecordsQueryKey(workspaceId ?? '') }),
  });
}
