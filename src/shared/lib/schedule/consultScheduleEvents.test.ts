import { describe, expect, it } from 'vitest';
import { consultEventLabel, groupConsultEventsByDate, type ConsultScheduleEvent } from './consultScheduleEvents';

function event(overrides: Partial<ConsultScheduleEvent> = {}): ConsultScheduleEvent {
  return {
    id: 'note-1',
    vendorName: '업체',
    vendorType: '웨딩홀',
    visitDate: '2026-09-10',
    status: 'scheduled',
    address: '서울 강남구',
    ...overrides,
  };
}

describe('groupConsultEventsByDate', () => {
  it('방문 날짜를 키로 묶는다', () => {
    const map = groupConsultEventsByDate([
      event({ id: 'a', visitDate: '2026-09-10' }),
      event({ id: 'b', visitDate: '2026-09-11' }),
    ]);
    expect(map.get('2026-09-10')?.map((e) => e.id)).toEqual(['a']);
    expect(map.get('2026-09-11')?.map((e) => e.id)).toEqual(['b']);
  });

  it('같은 날 여러 건은 업체명 순으로 고정한다', () => {
    const map = groupConsultEventsByDate([
      event({ id: 'a', vendorName: '하나웨딩' }),
      event({ id: 'b', vendorName: '가나스튜디오' }),
    ]);
    expect(map.get('2026-09-10')?.map((e) => e.vendorName)).toEqual(['가나스튜디오', '하나웨딩']);
  });

  it('타임스탬프가 섞여 들어와도 날짜 부분만 키로 쓴다', () => {
    const map = groupConsultEventsByDate([event({ visitDate: '2026-09-10T14:00:00+09:00' })]);
    expect([...map.keys()]).toEqual(['2026-09-10']);
  });

  it('날짜가 비어 있는 노트는 달력에 올리지 않는다', () => {
    const map = groupConsultEventsByDate([event({ visitDate: '' })]);
    expect(map.size).toBe(0);
  });

  it('빈 목록이면 빈 맵을 준다', () => {
    expect(groupConsultEventsByDate([]).size).toBe(0);
  });
});

describe('consultEventLabel', () => {
  it('업체명 뒤에 상담을 붙인다', () => {
    expect(consultEventLabel(event({ vendorName: 'W웨딩홀' }))).toBe('W웨딩홀 상담');
  });
});
