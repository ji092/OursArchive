import type { PrepItem, WeddingCategory } from './types';

// 요구사항 5.3 주석: "요약·헤더 통계는 이 세 테이블의 집계 쿼리로 파생 (별도 저장 안 함)".
// 프론트에서도 동일 원칙 — 아래는 전부 순수 계산 함수이고, 어디에도 결과를 저장하지 않는다.
export function computeDday(weddingDateIso: string, now = new Date()): number {
  const wedding = new Date(`${weddingDateIso}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = new Date(wedding.getFullYear(), wedding.getMonth(), wedding.getDate()).getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function computeChecklistProgress(items: PrepItem[]) {
  const withChecklist = items.filter((item) => item.checklist);
  const done = withChecklist.filter((item) => item.checklist!.done).length;
  const total = withChecklist.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function computeBudgetSummary(items: PrepItem[]) {
  const withBudget = items.filter((item) => item.budget);
  const planned = withBudget.reduce((sum, item) => sum + item.budget!.plannedAmount, 0);
  const used = withBudget.reduce((sum, item) => sum + item.budget!.usedAmount, 0);
  return { planned, used, remaining: planned - used, percent: planned === 0 ? 0 : Math.round((used / planned) * 100) };
}

export function computeCategoryProgress(items: PrepItem[]): Partial<Record<WeddingCategory, { done: number; total: number }>> {
  const result: Partial<Record<WeddingCategory, { done: number; total: number }>> = {};
  for (const item of items) {
    if (!item.checklist) continue;
    const bucket = result[item.category] ?? { done: 0, total: 0 };
    bucket.total += 1;
    if (item.checklist.done) bucket.done += 1;
    result[item.category] = bucket;
  }
  return result;
}

export function computeCategoryBudget(items: PrepItem[]): Partial<Record<WeddingCategory, { planned: number; used: number }>> {
  const result: Partial<Record<WeddingCategory, { planned: number; used: number }>> = {};
  for (const item of items) {
    if (!item.budget) continue;
    const bucket = result[item.category] ?? { planned: 0, used: 0 };
    bucket.planned += item.budget.plannedAmount;
    bucket.used += item.budget.usedAmount;
    result[item.category] = bucket;
  }
  return result;
}

export function findNextEvent(items: PrepItem[], now = new Date()): PrepItem | undefined {
  return items
    .filter((item) => item.schedule && new Date(item.schedule.scheduledAt) >= now)
    .sort((a, b) => new Date(a.schedule!.scheduledAt).getTime() - new Date(b.schedule!.scheduledAt).getTime())[0];
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
