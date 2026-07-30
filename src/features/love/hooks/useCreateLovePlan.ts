import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLovePlan } from '../api';
import { lovePlansQueryKey } from './useLovePlans';

export function useCreateLovePlan(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLovePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lovePlansQueryKey(workspaceId ?? '') }),
  });
}
