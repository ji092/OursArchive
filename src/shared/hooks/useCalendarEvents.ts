import type { QueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { fetchCalendarEvents } from '@/shared/lib/schedule/calendarEventsApi';

// 챕터를 가리지 않는 통합 일정 조회. 메인 달력은 이 결과를 전부, 챕터 달력은 자기 챕터만 그린다.
export const calendarEventsQueryKey = (workspaceId: string) => ['calendar-events', workspaceId] as const;

export function useCalendarEvents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: calendarEventsQueryKey(workspaceId ?? ''),
    queryFn: () => fetchCalendarEvents(workspaceId!),
    enabled: !!workspaceId,
  });
}

// 일정을 건드리는 모든 뮤테이션(연애 일정/결혼 항목·상담노트·신혼여행/임신 일정·검진)이
// 자기 캐시와 함께 이 키도 무효화해야 한다 — 한쪽만 지우면 달력이 옛 값을 계속 보여준다.
export function invalidateCalendarEvents(queryClient: QueryClient, workspaceId: string | undefined) {
  return queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey(workspaceId ?? '') });
}
