export interface LovePlan {
  id: string;
  title: string;
  plannedAt: string; // ISO date
}

// GET /love/plans(API 명세 6.3)가 아직 연결되지 않아 임시로 둔 목데이터 — 계획(미래) 축 본 구현 전까지
// 달력 뷰의 일정 동그라미 표시를 검증하는 용도.
export const mockLovePlans: LovePlan[] = [
  { id: 'plan-1', title: '한강 피크닉', plannedAt: '2026-07-25' },
  { id: 'plan-2', title: '영화 보기', plannedAt: '2026-07-26' },
  { id: 'plan-3', title: '기념일 저녁', plannedAt: '2026-07-05' },
];
