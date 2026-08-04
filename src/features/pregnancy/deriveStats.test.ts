import { describe, expect, it } from 'vitest';
import {
  computeCurrentWeek,
  computeDday,
  computeExpenseCategoryTotals,
  computeExpenseTotal,
  computeProgressPercent,
  filterExpensesByMonth,
  filterExpensesByYear,
} from './deriveStats';
import type { PregnancyExpense } from './types';

function expense(overrides: Partial<PregnancyExpense> = {}): PregnancyExpense {
  return {
    id: overrides.id ?? 'exp-1',
    category: '병원·검진',
    amount: 10000,
    date: '2026-08-04',
    memo: '',
    ...overrides,
  };
}

describe('computeCurrentWeek', () => {
  it('예정일이 정확히 40주 뒤면 1주차', () => {
    expect(computeCurrentWeek('2026-12-10', new Date('2026-03-11T00:00:00'))).toBe(1);
  });

  it('예정일 당일이면 40주차', () => {
    expect(computeCurrentWeek('2026-08-04', new Date('2026-08-04T00:00:00'))).toBe(40);
  });

  it('예정일이 지났어도 40주차 아래로 내려가지 않는다', () => {
    expect(computeCurrentWeek('2026-08-01', new Date('2026-08-10T00:00:00'))).toBe(40);
  });

  it('임신 극초반이어도 1주차 아래로 내려가지 않는다', () => {
    expect(computeCurrentWeek('2027-06-01', new Date('2026-08-04T00:00:00'))).toBe(1);
  });
});

describe('computeDday', () => {
  it('예정일이 미래면 양수', () => {
    expect(computeDday('2026-08-10', new Date('2026-08-04T00:00:00'))).toBe(6);
  });

  it('예정일 당일이면 0', () => {
    expect(computeDday('2026-08-04', new Date('2026-08-04T18:00:00'))).toBe(0);
  });
});

describe('computeProgressPercent', () => {
  it('40주 기준으로 퍼센트를 계산한다', () => {
    expect(computeProgressPercent(20)).toBe(50);
    expect(computeProgressPercent(40)).toBe(100);
    expect(computeProgressPercent(1)).toBe(3);
  });
});

describe('filterExpensesByMonth / filterExpensesByYear', () => {
  const expenses = [
    expense({ id: '1', date: '2026-08-04' }),
    expense({ id: '2', date: '2026-08-20' }),
    expense({ id: '3', date: '2026-09-01' }),
    expense({ id: '4', date: '2025-08-04' }),
  ];

  it('같은 해·같은 달만 남긴다', () => {
    const result = filterExpensesByMonth(expenses, 2026, 7); // JS Date는 월이 0부터 시작 (8월 = 7)
    expect(result.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('같은 해면 달과 무관하게 남긴다', () => {
    const result = filterExpensesByYear(expenses, 2026);
    expect(result.map((e) => e.id)).toEqual(['1', '2', '3']);
  });

  it('해당하는 지출이 없으면 빈 배열', () => {
    expect(filterExpensesByYear(expenses, 2030)).toEqual([]);
  });
});

describe('computeExpenseTotal', () => {
  it('금액을 전부 더한다', () => {
    const expenses = [expense({ amount: 10000 }), expense({ amount: 25000 })];
    expect(computeExpenseTotal(expenses)).toBe(35000);
  });

  it('빈 배열이면 0', () => {
    expect(computeExpenseTotal([])).toBe(0);
  });
});

describe('computeExpenseCategoryTotals', () => {
  it('카테고리별로 합산하고 금액 내림차순으로 정렬한다', () => {
    const expenses = [
      expense({ category: '병원·검진', amount: 10000 }),
      expense({ category: '아기옷·용품', amount: 50000 }),
      expense({ category: '병원·검진', amount: 20000 }),
    ];
    expect(computeExpenseCategoryTotals(expenses)).toEqual([
      { category: '아기옷·용품', amount: 50000 },
      { category: '병원·검진', amount: 30000 },
    ]);
  });

  it('빈 배열이면 빈 배열', () => {
    expect(computeExpenseCategoryTotals([])).toEqual([]);
  });
});
