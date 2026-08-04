import { describe, expect, it } from 'vitest';
import {
  computeBudgetSummary,
  computeCategoryBudget,
  computeCategoryProgress,
  computeChecklistProgress,
  computeDday,
  findNextEvent,
  formatWon,
} from './deriveStats';
import type { PrepItem } from './types';

function payment(amount: number) {
  return { amount, method: null, memo: '' };
}

function item(overrides: Partial<PrepItem> = {}): PrepItem {
  return {
    id: overrides.id ?? 'item-1',
    title: '항목',
    category: '웨딩홀',
    assigneeId: null,
    assigneeName: null,
    consultNoteIds: [],
    ...overrides,
  };
}

describe('computeDday', () => {
  it('결혼식이 미래면 양수', () => {
    expect(computeDday('2026-08-10', new Date('2026-08-04T00:00:00'))).toBe(6);
  });

  it('결혼식 당일이면 0', () => {
    expect(computeDday('2026-08-04', new Date('2026-08-04T15:00:00'))).toBe(0);
  });

  it('결혼식이 지났으면 음수', () => {
    expect(computeDday('2026-08-01', new Date('2026-08-04T00:00:00'))).toBe(-3);
  });
});

describe('computeChecklistProgress', () => {
  it('체크리스트가 없는 항목은 집계에서 제외한다', () => {
    const items = [item({ id: '1', checklist: { done: true, dueDate: '2026-08-01' } }), item({ id: '2' })];
    expect(computeChecklistProgress(items)).toEqual({ done: 1, total: 1, percent: 100 });
  });

  it('전부 미완료면 0퍼센트', () => {
    const items = [item({ checklist: { done: false, dueDate: '2026-08-01' } })];
    expect(computeChecklistProgress(items).percent).toBe(0);
  });

  it('항목이 없으면 0으로 나누지 않고 0퍼센트를 반환한다', () => {
    expect(computeChecklistProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('computeBudgetSummary', () => {
  it('예산 대비 지출·잔여·확정 총액을 계산한다', () => {
    const items = [
      item({
        id: '1',
        budget: {
          plannedAmount: 1000,
          usedAmount: 400,
          deposit: payment(100),
          interim: payment(200),
          balance: payment(300),
        },
      }),
    ];
    const summary = computeBudgetSummary(items);
    expect(summary.planned).toBe(1000);
    expect(summary.used).toBe(400);
    expect(summary.remaining).toBe(600);
    expect(summary.committed).toBe(600); // 100 + 200 + 300
    expect(summary.usedPercent).toBe(40);
  });

  it('예산이 0이면 퍼센트 계산에서 0으로 나누지 않는다', () => {
    const items = [
      item({
        budget: { plannedAmount: 0, usedAmount: 0, deposit: payment(0), interim: payment(0), balance: payment(0) },
      }),
    ];
    const summary = computeBudgetSummary(items);
    expect(summary.usedPercent).toBe(0);
    expect(summary.remainingPercent).toBe(0);
  });

  it('실지출이 예산을 초과해도 퍼센트는 100을 넘지 않는다', () => {
    const items = [
      item({
        budget: { plannedAmount: 100, usedAmount: 300, deposit: payment(0), interim: payment(0), balance: payment(0) },
      }),
    ];
    expect(computeBudgetSummary(items).usedPercent).toBe(100);
  });

  it('예산 없는 항목은 집계에서 제외한다', () => {
    const items = [item({ id: '1' })];
    expect(computeBudgetSummary(items)).toMatchObject({ planned: 0, used: 0, committed: 0 });
  });
});

describe('computeCategoryProgress / computeCategoryBudget', () => {
  it('카테고리별로 나눠서 집계한다', () => {
    const items = [
      item({ id: '1', category: '웨딩홀', checklist: { done: true, dueDate: '2026-08-01' } }),
      item({ id: '2', category: '웨딩홀', checklist: { done: false, dueDate: '2026-08-01' } }),
      item({ id: '3', category: '스드메', checklist: { done: true, dueDate: '2026-08-01' } }),
    ];
    expect(computeCategoryProgress(items)).toEqual({
      웨딩홀: { done: 1, total: 2 },
      스드메: { done: 1, total: 1 },
    });
  });

  it('예산도 카테고리별로 합산한다', () => {
    const items = [
      item({
        id: '1',
        category: '혼수',
        budget: { plannedAmount: 100, usedAmount: 50, deposit: payment(0), interim: payment(0), balance: payment(0) },
      }),
      item({
        id: '2',
        category: '혼수',
        budget: { plannedAmount: 200, usedAmount: 100, deposit: payment(0), interim: payment(0), balance: payment(0) },
      }),
    ];
    expect(computeCategoryBudget(items)).toEqual({ 혼수: { planned: 300, used: 150 } });
  });
});

describe('findNextEvent', () => {
  const now = new Date('2026-08-04T00:00:00');

  it('현재 이후 일정 중 가장 이른 것을 반환한다', () => {
    const items = [
      item({ id: 'late', schedule: { scheduledAt: '2026-09-01T00:00:00', location: '', eventType: '상담' } }),
      item({ id: 'soon', schedule: { scheduledAt: '2026-08-05T00:00:00', location: '', eventType: '상담' } }),
    ];
    expect(findNextEvent(items, now)?.id).toBe('soon');
  });

  it('지난 일정은 제외한다', () => {
    const items = [item({ schedule: { scheduledAt: '2026-08-01T00:00:00', location: '', eventType: '상담' } })];
    expect(findNextEvent(items, now)).toBeUndefined();
  });

  it('일정 없는 항목뿐이면 undefined', () => {
    expect(findNextEvent([item()], now)).toBeUndefined();
  });
});

describe('formatWon', () => {
  it('천 단위 구분 기호를 붙이고 원을 붙인다', () => {
    expect(formatWon(1000000)).toBe('1,000,000원');
  });

  it('0원도 그대로 표시한다', () => {
    expect(formatWon(0)).toBe('0원');
  });
});
