import { describe, expect, it } from 'vitest';
import { sortConsultNotesForList } from './sortConsultNotes';
import type { ConsultNote } from './types';

function note(overrides: Partial<ConsultNote> = {}): ConsultNote {
  return {
    id: 'n1',
    vendorName: '업체',
    vendorType: '웨딩홀',
    contactPhone: '',
    visitDate: '2026-09-10',
    visitTime: null,
    status: 'scheduled',
    keyMemos: [],
    questions: [],
    address: '',
    lat: null,
    lng: null,
    photos: [],
    ...overrides,
  };
}

describe('sortConsultNotesForList', () => {
  it('예정이 먼저(오름차순), 완료가 뒤(내림차순)', () => {
    const notes = [
      note({ id: 'done-old', status: 'done', visitDate: '2026-08-01' }),
      note({ id: 'sched-late', visitDate: '2026-10-01' }),
      note({ id: 'done-recent', status: 'done', visitDate: '2026-08-20' }),
      note({ id: 'sched-soon', visitDate: '2026-09-15' }),
    ];
    expect(sortConsultNotesForList(notes).map((n) => n.id)).toEqual([
      'sched-soon',
      'sched-late',
      'done-recent',
      'done-old',
    ]);
  });

  it('같은 날짜는 시각으로 가른다', () => {
    const notes = [
      note({ id: 'pm', visitDate: '2026-09-10', visitTime: '15:00' }),
      note({ id: 'am', visitDate: '2026-09-10', visitTime: '10:00' }),
    ];
    expect(sortConsultNotesForList(notes).map((n) => n.id)).toEqual(['am', 'pm']);
  });

  it('시각이 없는 노트는 그 날 맨 앞에 둔다', () => {
    const notes = [
      note({ id: 'timed', visitDate: '2026-09-10', visitTime: '10:00' }),
      note({ id: 'no-time', visitDate: '2026-09-10', visitTime: null }),
    ];
    expect(sortConsultNotesForList(notes).map((n) => n.id)).toEqual(['no-time', 'timed']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const notes = [note({ id: 'b', visitDate: '2026-10-01' }), note({ id: 'a', visitDate: '2026-09-01' })];
    sortConsultNotesForList(notes);
    expect(notes.map((n) => n.id)).toEqual(['b', 'a']);
  });
});
