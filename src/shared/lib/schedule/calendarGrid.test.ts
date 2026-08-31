import { describe, expect, it } from 'vitest';
import { buildMonthCells, monthCellDateKey, WEEKDAY_LABELS } from './calendarGrid';

describe('buildMonthCells', () => {
  it('1일의 요일만큼 앞을 비운다', () => {
    // 2026-09-01은 화요일 → 일·월 두 칸이 앞에 비어야 한다
    const cells = buildMonthCells(2026, 8);
    expect(cells.slice(0, 3)).toEqual([null, null, 1]);
  });

  it('그 달의 날짜를 모두 담는다', () => {
    expect(buildMonthCells(2026, 8).filter((c) => c !== null)).toHaveLength(30);
    expect(buildMonthCells(2026, 7).filter((c) => c !== null)).toHaveLength(31);
    expect(buildMonthCells(2028, 1).filter((c) => c !== null)).toHaveLength(29); // 윤년 2월
  });

  it('기본값은 마지막 줄까지 7칸으로 채운다', () => {
    expect(buildMonthCells(2026, 8).length % 7).toBe(0);
  });

  it('padTrailing이 false면 뒤쪽 빈 칸을 만들지 않는다', () => {
    const cells = buildMonthCells(2026, 8, { padTrailing: false });
    expect(cells[cells.length - 1]).toBe(30);
  });
});

describe('monthCellDateKey', () => {
  it('한 자리 월·일을 0으로 채운다', () => {
    expect(monthCellDateKey(2026, 8, 5)).toBe('2026-09-05');
    expect(monthCellDateKey(2026, 0, 1)).toBe('2026-01-01');
  });
});

describe('WEEKDAY_LABELS', () => {
  it('일요일부터 7개다', () => {
    expect(WEEKDAY_LABELS).toEqual(['일', '월', '화', '수', '목', '금', '토']);
  });
});
