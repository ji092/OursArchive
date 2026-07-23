// 요구사항 3.4.1 — 주차 헤더 통계도 저장하지 않고 매번 예정일로부터 파생 계산한다.
const TOTAL_WEEKS = 40;

export function computeCurrentWeek(dueDateIso: string, now = new Date()): number {
  const due = new Date(dueDateIso);
  const daysUntilDue = Math.round((due.getTime() - now.getTime()) / 86400000);
  const week = TOTAL_WEEKS - Math.floor(daysUntilDue / 7);
  return Math.min(Math.max(week, 1), TOTAL_WEEKS);
}

export function computeDday(dueDateIso: string, now = new Date()): number {
  const due = new Date(dueDateIso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

export function computeProgressPercent(currentWeek: number): number {
  return Math.round((currentWeek / TOTAL_WEEKS) * 100);
}
