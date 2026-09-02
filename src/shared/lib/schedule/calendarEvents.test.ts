import { describe, expect, it } from 'vitest';
import {
  calendarEventDateKey,
  localDateKey,
  calendarEventKey,
  dateOnlyToStartAt,
  filterCalendarEventsByChapter,
  filterCalendarEventsByMonth,
  findNextCalendarEvent,
  findUpcomingCalendarEvents,
  formatCalendarEventDateTime,
  isDeadlineEvent,
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

  it('다가오는 일정이 위(가까운 순), 지난 일정이 아래(오래된 순)로 간다', () => {
    const events = [
      event({ sourceId: 'past-old', startAt: new Date('2026-09-01T10:00:00').toISOString() }),
      event({ sourceId: 'future-far', startAt: new Date('2026-09-20T10:00:00').toISOString() }),
      event({ sourceId: 'past-recent', startAt: new Date('2026-09-08T10:00:00').toISOString() }),
      event({ sourceId: 'future-near', startAt: new Date('2026-09-12T10:00:00').toISOString() }),
    ];
    expect(sortCalendarEventsForList(events, now).map((e) => e.sourceId)).toEqual([
      'future-near',
      'future-far',
      'past-old',
      'past-recent',
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

describe('findNextCalendarEvent', () => {
  const now = new Date('2026-09-10T12:00:00');

  it('달력과 같은 통합 목록에서 가장 가까운 다음 일정을 고른다', () => {
    const next = findNextCalendarEvent(
      [
        event({ sourceId: 'a', title: '나중', startAt: new Date('2026-09-20T10:00:00').toISOString() }),
        event({ sourceId: 'b', title: '곧', startAt: new Date('2026-09-11T10:00:00').toISOString() }),
        event({ sourceId: 'c', title: '지난', startAt: new Date('2026-09-01T10:00:00').toISOString() }),
      ],
      now,
    );
    expect(next?.title).toBe('곧');
  });

  it('챕터를 가리지 않고 상담노트·신혼여행 같은 소스도 후보에 넣는다', () => {
    const next = findNextCalendarEvent(
      [
        event({ sourceType: 'wedding_schedule', sourceId: 'w', chapter: 'wedding', title: '본식', startAt: new Date('2026-10-10T11:00:00').toISOString() }),
        event({ sourceType: 'consult_note', sourceId: 'n', chapter: 'wedding', title: '스튜디오 상담', startAt: dateOnlyToStartAt('2026-09-15'), hasTime: false }),
      ],
      now,
    );
    expect(next?.title).toBe('스튜디오 상담');
  });

  it('오늘 날짜의 종일 일정은 아직 지나지 않은 것으로 본다', () => {
    const next = findNextCalendarEvent(
      [event({ sourceType: 'honeymoon', sourceId: 'h', title: '신혼여행 출발', startAt: dateOnlyToStartAt('2026-09-10'), hasTime: false })],
      now,
    );
    expect(next?.title).toBe('신혼여행 출발');
  });

  it('오늘 일정은 시각이 이미 지났어도 포함한다', () => {
    const next = findNextCalendarEvent(
      [event({ title: '오늘 오전', startAt: new Date('2026-09-10T09:00:00').toISOString() })],
      now,
    );
    expect(next?.title).toBe('오늘 오전');
  });

  it('어제 일정은 고르지 않는다', () => {
    expect(findNextCalendarEvent([event({ startAt: new Date('2026-09-09T23:00:00').toISOString() })], now)).toBeUndefined();
  });

  it('다가오는 일정이 없으면 undefined', () => {
    expect(findNextCalendarEvent([event({ startAt: new Date('2026-08-01T10:00:00').toISOString() })], now)).toBeUndefined();
  });
});

describe('formatCalendarEventDateTime', () => {
  it('시간이 있는 일정은 시각까지 찍는다', () => {
    const text = formatCalendarEventDateTime(event({ startAt: new Date('2026-09-05T14:00:00').toISOString() }));
    expect(text).toContain('9월 5일');
    expect(text).toContain('2:00');
  });

  it('날짜만 있는 일정은 시각을 찍지 않는다', () => {
    const text = formatCalendarEventDateTime(event({ startAt: dateOnlyToStartAt('2026-09-05'), hasTime: false }));
    expect(text).toContain('9월 5일');
    expect(text).not.toMatch(/\d:\d\d/);
  });
});

describe('findUpcomingCalendarEvents', () => {
  const now = new Date('2026-09-10T12:00:00');

  it('오늘 포함 가까운 순으로 요청한 개수만큼 자른다', () => {
    const events = [
      event({ sourceId: 'd4', startAt: new Date('2026-09-25T10:00:00').toISOString() }),
      event({ sourceId: 'd1', startAt: new Date('2026-09-10T09:00:00').toISOString() }),
      event({ sourceId: 'd3', startAt: new Date('2026-09-20T10:00:00').toISOString() }),
      event({ sourceId: 'd2', startAt: new Date('2026-09-12T10:00:00').toISOString() }),
      event({ sourceId: 'past', startAt: new Date('2026-09-01T10:00:00').toISOString() }),
    ];
    expect(findUpcomingCalendarEvents(events, 3, now).map((e) => e.sourceId)).toEqual(['d1', 'd2', 'd3']);
  });

  it('요청 개수보다 적으면 있는 것만 돌려준다', () => {
    const events = [event({ sourceId: 'only', startAt: new Date('2026-09-12T10:00:00').toISOString() })];
    expect(findUpcomingCalendarEvents(events, 5, now).map((e) => e.sourceId)).toEqual(['only']);
  });

  it('다가오는 일정이 없으면 빈 배열', () => {
    expect(findUpcomingCalendarEvents([event({ startAt: new Date('2026-08-01T10:00:00').toISOString() })], 5, now)).toEqual([]);
  });

  it('체크리스트 기한도 후보에 들어간다', () => {
    const events = [
      event({ sourceType: 'checklist_due', sourceId: 'c1', chapter: 'wedding', title: '"청첩장 주문" 기한', startAt: dateOnlyToStartAt('2026-09-11'), hasTime: false }),
      event({ sourceId: 'p1', startAt: new Date('2026-09-15T10:00:00').toISOString() }),
    ];
    expect(findUpcomingCalendarEvents(events, 2, now).map((e) => e.sourceId)).toEqual(['c1', 'p1']);
  });
});

describe('formatCalendarEventTime · 체크리스트 기한', () => {
  it('기한은 시간 미정이 아니라 "이 날까지"로 적는다', () => {
    expect(formatCalendarEventTime(event({ sourceType: 'checklist_due', hasTime: false }))).toBe('이 날까지');
  });
});

describe('isDeadlineEvent', () => {
  it('체크리스트 기한만 마감 표시 대상이다', () => {
    expect(isDeadlineEvent(event({ sourceType: 'checklist_due' }))).toBe(true);
    expect(isDeadlineEvent(event({ sourceType: 'wedding_schedule' }))).toBe(false);
    expect(isDeadlineEvent(event({ sourceType: 'consult_note' }))).toBe(false);
  });
});
