import { useQuery } from '@tanstack/react-query';
import { fetchConsultScheduleEvents } from '@/shared/lib/schedule/consultScheduleApi';

// 상담노트를 달력 일정으로 읽는 공용 쿼리. 결혼 챕터의 노트 생성/수정 뮤테이션이
// 이 키도 같이 무효화하므로(features/wedding/hooks/useWeddingData.ts), 노트를 쓴 즉시
// 세 챕터 달력에 반영된다.
export const consultScheduleEventsQueryKey = (workspaceId: string) => ['consult-schedule-events', workspaceId] as const;

export function useConsultScheduleEvents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: consultScheduleEventsQueryKey(workspaceId ?? ''),
    queryFn: () => fetchConsultScheduleEvents(workspaceId!),
    enabled: !!workspaceId,
  });
}
