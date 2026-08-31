// 화면에 날짜·시각을 찍는 공용 포맷터. 같은 서식을 여러 화면이 각자 복사해 쓰고 있었다
// (결혼 일정·요약, 임신 일정 — 2026-09-01 정리).
// 예: "9월 5일 (토) 오후 2:00"
export function formatMonthDayWeekdayTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// 예: "9월 5일 오후 2:00" (요일 없음)
export function formatMonthDayTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
