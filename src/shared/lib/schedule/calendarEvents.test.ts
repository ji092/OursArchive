import { describe, expect, it } from 'vitest';
import {
  calendarEventDateKey,
  localDateKey,
  calendarEventKey,
  dateOnlyToStartAt,
  filterCalendarEventsByChapter,
  filterCalendarEventsByMonth,
  formatCalendarEventTime,
  groupCalendarEventsByDate,
  sortCalendarEvents,
  sortCalendarEventsForList,
  type CalendarEvent,
} from './calendarEvents';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    sourceType: 'love_plan',
    sourceId: 'plan-1',
    chapter: 'love',
    title: '데이트',
    badge: '데이트',
    startAt: new Date('2026-09-10T14:00:00').toISOString(),
    hasTime: true,
    location: '성수',
    linkTo: '/love/calendar',
    ...overrides,
  };
}

describe('calendarEventDateKey', () => {
  it('사용자 로컬 날짜 기준으로 키를 만든다', () => {
    const key = calendarEventDateKey(event({ startAt: new Date('2026-09-10T23:30:00').toISOString() }));
    expect(key).toBe('2026-09-10');
  });

  it('날짜만 있는 일정도 그 날 칸에 들어간다', () => {
    expect(calendarEventDateKey(event({ startAt: dateOnlyToStartAt('2026-09-10'), hasTime: false }))).toBe('2026-09-10');
  });

  it('날짜를 못 읽으면 빈 문자열을 준다', () => {
    expect(calendarEventDateKey(event({ startAt: 'not-a-date' }))).toBe('');
  });
});

describe('localDateKey', () => {
  it('UTC로 자르면 하루 밀리는 오전 일정도 그 날 칸에 넣는다', () => {
    // 한국 시간 오전 8시 = 전날 23시 UTC — ISO 앞 10자를 자르면 전날로 밀린다.
    const iso = new Date('2026-09-10T08:00:00').toISOString();
    expect(localDateKey(iso)).toBe('2026-09-10');
  });

  it('자정 직전 일정도 그 날 칸에 남는다', () => {
    expect(localDateKey(new Date('2026-09-10T23:59:00').toISOString())).toBe('2026-09-10');
  });

  it('날짜를 못 읽으면 빈 문자열을 준다', () => {
    expect(localDateKey('not-a-date')).toBe('');
  });
});

describe('groupCalendarEventsByDate', () => {
  it('여러 챕터의 일정을 같은 날짜 칸에 함께 담는다', () => {
    const map = groupCalendarEventsByDate([
      event({ sourceId: 'a', chapter: 'love', startAt: new Date('2026-09-10T18:00:00').toISOString() }),
      event({ sourceId: 'b', chapter: 'wedding', sourceType: 'wedding_schedule', startAt: new Date('2026-09-10T10:00:00').toISOString() }),
      event({ sourceId: 'c', chapter: 'pregnancy', sourceType: 'pregnancy_event', startAt: new Date('2026-09-11T10:00:00').toISOString() }),
    ]);
    expect(map.get('2026-09-10')?.map((e) => e.sourceId)).toEqual(['b', 'a']);
    expect(map.get('2026-09-11')?.map((e) => e.sourceId)).toEqual(['c']);
  });

  it('날짜를 못 읽는 일정은 어느 칸에도 넣지 않는다', () => {
    expect(groupCalendarEventsByDate([event({ startAt: '' })]).size).toBe(0);
  });

  it('빈 목록이면 빈 맵을 준다', () => {
    expect(groupCalendarEventsByDate([]).size).toBe(0);
  });
});

describe('sortCalendarEvents', () => {
  it('시각 순으로 정렬하고 같은 시각이면 제목순으로 고정한다', () => {
    const sorted = sortCalendarEvents([
      event({ sourceId: 'b', title: '하나', startAt: new Date('2026-09-10T10:00:00').toISOString() }),
      event({ sourceId: 'a', title: '가나', startAt: new Date('2026-09-10T10:00:00').toISOString() }),
      event({ sourceId: 'c', title: '다라', startAt: new Date('2026-09-09T10:00:00').toISOString() }),
    ]);
    expect(sorted.map((e) => e.sourceId)).toEqual(['c', 'a', 'b']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const events = [event({ sourceId: 'b', startAt: new Date('2026-09-11T10:00:00').toISOString() }), event({ sourceId: 'a' })];
    sortCalendarEvents(events);
    expect(events.map((e) => e.sourceId)).toEqual(['b', 'a']);
  });
});

describe('filterCalendarEventsByChapter', () => {
  it('지정한 챕터만 남긴다', () => {
    const events = [event({ chapter: 'love' }), event({ chapter: 'wedding' }), event({ chapter: 'pregnancy' })];
    expect(filterCalendarEventsByChapter(events, ['wedding']).map((e) => e.chapter)).toEqual(['wedding']);
    expect(filterCalendarEventsByChapter(events, ['love', 'pregnancy']).map((e) => e.chapter)).toEqual(['love', 'pregnancy']);
  });
});

describe('formatCalendarEventTime', () => {
  it('시간이 있는 일정은 오전/오후로 표시한다', () => {
    expect(formatCalendarEventTime(event({ startAt: new Date('2026-09-10T14:05:00').toISOString() }))).toBe('오후 2:05');
    expect(formatCalendarEventTime(event({ startAt: new Date('2026-09-10T00:30:00').toISOString() }))).toBe('오전 12:30');
  });

  it('날짜만 있는 일정은 시간 미정으로 표시한다', () => {
    expect(formatCalendarEventTime(event({ hasTime: false }))).toBe('시간 미정');
  });
});

describe('calendarEventKey', () => {
  it('소스 종류와 id를 합쳐 달력 렌더 키를 만든다', () => {
    expect(calendarEventKey(event({ sourceType: 'consult_note', sourceId: 'n1' }))).toBe('consult_note:n1');
  });
});

describe('filterCalendarEventsByMonth', () => {
  it('달력이 보고 있는 달의 일정만 남긴다', () => {
    const events = [
      event({ sourceId: 'aug', startAt: new Date('2026-08-31T10:00:00').toISOString() }),
      event({ sourceId: 'sep', startAt: new Date('2026-09-01T10:00:00').toISOString() }),
      event({ sourceId: 'oct', startAt: new Date('2026-10-01T10:00:00').toISOString() }),
    ];
    expect(filterCalendarEventsByMonth(events, 2026, 7).map((e) => e.sourceId)).toEqual(['aug']);
    expect(filterCalendarEventsByMonth(events, 2026, 8).map((e) => e.sourceId)).toEqual(['sep']);
  });

  it('해가 다르면 같은 달이어도 제외한다', () => {
    const events = [event({ sourceId: 'y2026', startAt: new Date('2026-09-10T10:00:00').toISOString() })];
    expect(filterCalendarEventsByMonth(events, 2025, 8)).toEqual([]);
  });
});

describe('sortCalendarEventsForList', () => {
  const now = new Date('2026-09-10T12:00:00');

  it('다가오는 일정이 위, 지난 일정이 아래로 간다', () => {
    const events = [
      event({ sourceId: 'past-old', startAt: new Date('2026-09-01T10:00:00').toISOString() }),
      event({ sourceId: 'future-far', startAt: new Date('2026-09-20T10:00:00').toISOString() }),
      event({ sourceId: 'past-recent', startAt: new Date('2026-09-08T10:00:00').toISOString() }),
      event({ sourceId: 'future-near', startAt: new Date('2026-09-12T10:00:00').toISOString() }),
    ];
    expect(sortCalendarEventsForList(events, now).map((e) => e.sourceId)).toEqual([
      'future-near',
      'future-far',
      'past-recent',
      'past-old',
    ]);
  });

  it('오늘 일정은 시각이 지났어도 위에 남는다', () => {
    const events = [
      event({ sourceId: 'today-morning', startAt: new Date('2026-09-10T09:00:00').toISOString() }),
      event({ sourceId: 'yesterday', startAt: new Date('2026-09-09T09:00:00').toISOString() }),
    ];
    expect(sortCalendarEventsForList(events, now).map((e) => e.sourceId)).toEqual(['today-morning', 'yesterday']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const events = [
      event({ sourceId: 'a', startAt: new Date('2026-09-01T10:00:00').toISOString() }),
      event({ sourceId: 'b', startAt: new Date('2026-09-20T10:00:00').toISOString() }),
    ];
    sortCalendarEventsForList(events, now);
    expect(events.map((e) => e.sourceId)).toEqual(['a', 'b']);
  });
});
