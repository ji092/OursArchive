import type { Checkup, PregnancyDiary, PregnancyEvent, PregnancyExpense, WeekContent } from './types';

// localStorage가 비어있을 때(신규 브라우저/배포 도메인)의 최초 fallback — 실사용 데이터가 아니므로 빈 상태로 둔다
// (2026-07-28: 배포 도메인에서 옛 목데이터가 그대로 노출되던 문제를 계기로 전부 비움).
// 출산 예정일(dueDate)은 관리 페이지에서 입력하는 workspace 설정으로 옮겨졌다
// (src/shared/lib/workspace/workspaceSettingsApi.ts, 2026-07-23).

export const mockDiaries: PregnancyDiary[] = [];

export const mockCheckups: Checkup[] = [];

export const mockEvents: PregnancyEvent[] = [];

export const mockExpenses: PregnancyExpense[] = [];

// 실제로는 40주치가 필요하지만(요구사항 5.4 week_content), 의학적 정확성이 필요한 콘텐츠라
// DECISIONS.md 2026-07-22 결정대로 지금은 스키마/화면만 만들고 실데이터는 채우지 않는다.
// 현재 주차(18주) 근방만 자리표시자로 둔다.
export const mockWeekContent: Record<number, WeekContent> = {
  18: {
    weekNo: 18,
    sizeMetaphor: '고구마',
    weightG: 190,
    lengthCm: 14.2,
    development: '청각이 발달해 엄마 목소리를 듣기 시작해요.',
    motherTip: '태동을 느끼기 시작할 시기예요. 무리한 움직임은 피하고 충분히 쉬어주세요.',
  },
};
