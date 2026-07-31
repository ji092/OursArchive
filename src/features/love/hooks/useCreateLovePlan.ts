import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLovePlan, deleteLovePlan } from '../api';
import { lovePlansQueryKey } from './useLovePlans';

export function useCreateLovePlan(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLovePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lovePlansQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteLovePlan(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLovePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lovePlansQueryKey(workspaceId ?? '') }),
  });
}
