import type { ConsultNote } from './types';

// 상담노트 목록 정렬(2026-09-02 사용자 지정): 예정인 노트가 먼저, 방문일 오름차순(가까운 날짜부터).
// 그 뒤에 완료된 노트가 방문일 내림차순(최근에 다녀온 것부터)으로 붙는다.
// 방문일이 같으면 시각, 그것도 같으면 업체명으로 갈라 렌더 순서가 매번 흔들리지 않게 한다.
function visitKey(note: ConsultNote): string {
  return `${note.visitDate}T${note.visitTime ?? '00:00'}`;
}

export function sortConsultNotesForList(notes: ConsultNote[]): ConsultNote[] {
  const scheduled = notes.filter((note) => note.status !== 'done');
  const done = notes.filter((note) => note.status === 'done');
  const byVisitAsc = (a: ConsultNote, b: ConsultNote) => {
    const diff = visitKey(a).localeCompare(visitKey(b));
    return diff !== 0 ? diff : a.vendorName.localeCompare(b.vendorName, 'ko');
  };
  return [
    ...scheduled.sort(byVisitAsc),
    ...done.sort((a, b) => {
      const diff = visitKey(b).localeCompare(visitKey(a));
      return diff !== 0 ? diff : a.vendorName.localeCompare(b.vendorName, 'ko');
    }),
  ];
}
