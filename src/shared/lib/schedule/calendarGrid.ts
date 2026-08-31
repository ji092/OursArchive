// 달력 그리드를 그리는 데 필요한 값 — 요일 라벨, 월 셀 배열, 셀 날짜 키.
// 연애·결혼·임신 세 달력이 같은 코드를 각자 복사해 두고 있었다(2026-09-01 정리).
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 앞쪽은 1일의 요일만큼 빈 칸을 채운다. padTrailing이 true면 마지막 줄도 7칸으로 채워
// 격자 모양이 깨지지 않게 한다(결혼·임신 달력). 연애 달력은 뒤쪽 빈 칸을 그리지 않는다.
export function buildMonthCells(year: number, month: number, options?: { padTrailing?: boolean }): (number | null)[] {
  const padTrailing = options?.padTrailing ?? true;
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  if (padTrailing) {
    while (cells.length % 7 !== 0) cells.push(null);
  }
  return cells;
}

// 달력 셀 하나의 날짜 키(YYYY-MM-DD). localDateKey(ISO 문자열용)와 같은 형식이라
// 두 값을 그대로 비교할 수 있다.
export function monthCellDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
