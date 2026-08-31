// 결혼 준비 탭의 상담노트(consult_note)를 "일정"으로도 다루기 위한 공용 모델.
// 상담노트는 방문 날짜(visit_date)를 반드시 갖는데, 지금까지는 결혼 챕터의 노트 목록에서만
// 보였고 어떤 달력에도 나오지 않았다(2026-08-31 사용자 보고). 별도 일정 레코드를 새로 쓰면
// 노트와 일정이 두 벌로 갈라져 동기화 문제가 생기므로, 저장은 그대로 두고 조회 시점에
// 파생 계산해서 각 챕터 달력이 함께 그리도록 한다(CLAUDE.md — 통계·파생값은 저장하지 않는다).
//
// features/{love,wedding,pregnancy} 세 챕터가 모두 써야 하므로 챕터 간 직접 import 대신
// shared로 승격한 위치에 둔다.
export interface ConsultScheduleEvent {
  id: string;
  vendorName: string;
  vendorType: string;
  visitDate: string; // YYYY-MM-DD (상담노트는 시각을 받지 않는다 — 날짜 단위 일정)
  status: 'done' | 'scheduled';
  address: string;
}

// 달력 셀 렌더링용 — 날짜(YYYY-MM-DD) → 그 날의 상담 목록.
// 같은 날 여러 건이면 업체명 오름차순으로 고정해 렌더링 순서가 흔들리지 않게 한다.
export function groupConsultEventsByDate(events: ConsultScheduleEvent[]): Map<string, ConsultScheduleEvent[]> {
  const map = new Map<string, ConsultScheduleEvent[]>();
  for (const event of events) {
    if (!event.visitDate) continue;
    const key = event.visitDate.slice(0, 10);
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  for (const [key, list] of map) {
    map.set(key, [...list].sort((a, b) => a.vendorName.localeCompare(b.vendorName, 'ko')));
  }
  return map;
}

// 달력 셀 툴팁처럼 한 줄로 요약할 때 쓰는 표시 문구.
export function consultEventLabel(event: ConsultScheduleEvent): string {
  return `${event.vendorName} 상담`;
}
