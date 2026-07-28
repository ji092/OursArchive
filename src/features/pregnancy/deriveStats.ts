import type { PregnancyExpense } from './types';

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

// 지불(가계부) — 월/연 총 지출과 카테고리별 합계는 전부 저장하지 않고 원본 지출 내역에서 매번 파생한다.
export function filterExpensesByMonth(expenses: PregnancyExpense[], year: number, month: number): PregnancyExpense[] {
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function filterExpensesByYear(expenses: PregnancyExpense[], year: number): PregnancyExpense[] {
  return expenses.filter((e) => new Date(e.date).getFullYear() === year);
}

export function computeExpenseTotal(expenses: PregnancyExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function computeExpenseCategoryTotals(expenses: PregnancyExpense[]): { category: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}
