// 워크스페이스의 모든 "일정"을 챕터와 무관하게 한 모양으로 다루는 공용 모델.
//
// 배경(2026-08-31): 일정이 챕터별 테이블(love_plan / prep_item.schedule_attr / consult_note /
// honeymoon / pregnancy_event / checkup)에 흩어져 있고 각 달력이 자기 테이블만 읽어서,
// 결혼 탭에서 만든 일정이 메인 달력에 안 나오고 상담노트는 어디에도 안 나왔다. 새 "통합 일정"
// 테이블을 만들어 복제하면 원본과 두 벌이 되므로, 저장 위치는 그대로 두고 조회 시점에 하나로
// 합쳐서 보여준다(CLAUDE.md — 파생값은 저장하지 않는다).
//
// features 간 직접 import 금지 규칙 때문에 이 모델과 조회는 shared에 둔다.
export type CalendarChapter = 'love' | 'wedding' | 'pregnancy';

export type CalendarSourceType =
  | 'love_plan'
  | 'wedding_schedule'
  | 'consult_note'
  | 'honeymoon'
  | 'pregnancy_event'
  | 'pregnancy_checkup';

export interface CalendarEvent {
  sourceType: CalendarSourceType;
  sourceId: string;
  chapter: CalendarChapter;
  title: string;
  badge: string; // 일정 유형 표시(상담/본식/검진/데이트 ...)
  startAt: string; // ISO 8601. 날짜만 있는 일정은 그 날 00:00(로컬)로 맞춰 넣는다.
  hasTime: boolean; // 상담노트·신혼여행은 날짜만 받으므로 시간을 표시하지 않는다
  location: string;
  linkTo: string; // 클릭 시 이동할 경로(상세가 열리는 쿼리 파라미터 포함)
}

export const CHAPTER_LABELS: Record<CalendarChapter, string> = {
  love: '연애',
  wedding: '결혼',
  pregnancy: '임신',
};

export function calendarEventKey(event: CalendarEvent): string {
  return `${event.sourceType}:${event.sourceId}`;
}

// 달력 셀은 사용자의 로컬 날짜 기준으로 묶는다 — ISO 문자열 앞 10자를 그냥 자르면
// UTC 기준이라 밤 9시 이후 일정이 하루 뒤 칸에 찍힌다.
export function calendarEventDateKey(event: CalendarEvent): string {
  const date = new Date(event.startAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 시간 있는 일정이 먼저, 같은 시각이면 제목순 — 렌더 순서가 매번 흔들리지 않게 고정한다.
export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, 'ko');
  });
}

export function groupCalendarEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of sortCalendarEvents(events)) {
    const key = calendarEventDateKey(event);
    if (!key) continue; // 날짜를 못 읽는 행은 달력에 올리지 않는다
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  return map;
}

export function filterCalendarEventsByChapter(events: CalendarEvent[], chapters: CalendarChapter[]): CalendarEvent[] {
  return events.filter((event) => chapters.includes(event.chapter));
}

export function formatCalendarEventTime(event: CalendarEvent): string {
  if (!event.hasTime) return '시간 미정';
  const date = new Date(event.startAt);
  if (Number.isNaN(date.getTime())) return '시간 미정';
  const hours = date.getHours();
  const ampm = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${ampm} ${hour12}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 날짜만 받는 일정(상담노트 visit_date, 신혼여행 start_date)을 로컬 00:00 ISO로 올린다.
export function dateOnlyToStartAt(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toISOString();
}
