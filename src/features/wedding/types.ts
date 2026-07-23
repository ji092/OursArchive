// DB 설계(backend/migrations/0003_wedding.sql)와 짝을 맞춘 프론트 타입.
// prep_item + checklist_attr/schedule_attr/budget_attr을 프론트에서는 하나의 객체로 합쳐서 다룬다
// (API 명세 6.4의 통합 생성 예시와 동일한 모양) — 실제 연동 시에도 API 응답 shape가 이와 같다.
export type WeddingCategory = '웨딩홀' | '스드메' | '예물예단' | '청첩장' | '혼수' | '신혼여행' | '기타';
export type WeddingEventType = '상담' | '계약' | '청첩장모임' | '본식' | '기타';

export interface PrepItem {
  id: string;
  title: string;
  category: WeddingCategory;
  assigneeName: string | null; // null = "함께" (backend assignee_id FK 설계, DECISIONS.md 2026-07-22 참조)
  checklist?: { done: boolean; dueDate: string };
  schedule?: { scheduledAt: string; location: string; eventType: WeddingEventType };
  budget?: { plannedAmount: number; usedAmount: number };
  consultNoteIds: string[];
}

export interface ConsultNote {
  id: string;
  vendorName: string;
  vendorType: string;
  visitDate: string;
  status: 'done' | 'scheduled';
  keyMemos: string[];
  questions: string[];
}

export interface HoneymoonDay {
  dayNumber: number;
  title: string;
  detail: string;
}

export interface Honeymoon {
  destination: string;
  startDate: string;
  endDate: string;
  days: HoneymoonDay[];
}
