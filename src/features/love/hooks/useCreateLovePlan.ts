import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLovePlan, deleteLovePlan } from '../api';
import { invalidateCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import { lovePlansQueryKey } from './useLovePlans';

// 연애 일정은 연애 달력(lovePlansQueryKey)과 모든 달력이 함께 쓰는 통합 일정 양쪽에서 읽힌다.
function invalidateLovePlanQueries(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | undefined) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: lovePlansQueryKey(workspaceId ?? '') }),
    invalidateCalendarEvents(queryClient, workspaceId),
  ]);
}

export function useCreateLovePlan(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLovePlan,
    onSuccess: () => invalidateLovePlanQueries(queryClient, workspaceId),
  });
}

export function useDeleteLovePlan(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLovePlan,
    onSuccess: () => invalidateLovePlanQueries(queryClient, workspaceId),
  });
}
