import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addScheduleComment,
  deleteScheduleComment,
  fetchScheduleComments,
} from '@/shared/lib/schedule/scheduleCommentsApi';
import type { ScheduleSourceType } from '@/shared/lib/schedule/types';

function scheduleCommentsQueryKey(sourceType: ScheduleSourceType, sourceId: string) {
  return ['schedule-comments', sourceType, sourceId] as const;
}

export function useScheduleComments(sourceType: ScheduleSourceType, sourceId: string | undefined) {
  return useQuery({
    queryKey: scheduleCommentsQueryKey(sourceType, sourceId ?? ''),
    queryFn: () => fetchScheduleComments(sourceType, sourceId!),
    enabled: !!sourceId,
  });
}

export function useAddScheduleComment(sourceType: ScheduleSourceType, sourceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addScheduleComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduleCommentsQueryKey(sourceType, sourceId ?? '') }),
  });
}

export function useDeleteScheduleComment(sourceType: ScheduleSourceType, sourceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteScheduleComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduleCommentsQueryKey(sourceType, sourceId ?? '') }),
  });
}
