// DB 설계(backend/migrations/0003_wedding.sql)와 짝을 맞춘 프론트 타입.
// prep_item + checklist_attr/schedule_attr/budget_attr을 프론트에서는 하나의 객체로 합쳐서 다룬다
// (API 명세 6.4의 통합 생성 예시와 동일한 모양) — 실제 연동 시에도 API 응답 shape가 이와 같다.
export type WeddingCategory = '웨딩홀' | '스드메' | '예물예단' | '청첩장' | '혼수' | '신혼여행' | '기타';
export const WEDDING_CATEGORIES: WeddingCategory[] = ['웨딩홀', '스드메', '예물예단', '청첩장', '신혼여행', '혼수', '기타'];
export type WeddingEventType = '상담' | '계약' | '청첩장모임' | '본식' | '기타';
export type PaymentMethod = '카드' | '현금';

// 계약금/중도금/잔금 각각의 지출 방식 — 카드/현금 선택 + 자유 메모(예: "현대카드", "계좌이체", "인출").
export interface PaymentDetail {
  amount: number;
  method: PaymentMethod | null;
  memo: string;
}

export interface PrepItem {
  id: string;
  title: string;
  category: WeddingCategory;
  assigneeName: string | null; // null = "함께" (backend assignee_id FK 설계, DECISIONS.md 2026-07-22 참조)
  checklist?: { done: boolean; dueDate: string };
  schedule?: { scheduledAt: string; location: string; eventType: WeddingEventType };
  budget?: {
    plannedAmount: number; // 예산
    deposit: PaymentDetail; // 계약금
    interim: PaymentDetail; // 중도금
    balance: PaymentDetail; // 잔금
    usedAmount: number; // 실지출비용
  };
  consultNoteIds: string[];
}

// 실제 파일은 R2 연동 전까지 업로드하지 않으므로 개수만 반영해 표시용 그라디언트를 생성한다
// (love 피처와 동일 관례). 상담노트/신혼여행 일정 등 여러 곳에서 공용으로 쓴다.
export interface PhotoPlaceholder {
  gradient: string;
}

export interface ConsultNote {
  id: string;
  vendorName: string;
  vendorType: WeddingCategory; // 체크리스트와 같은 카테고리 목록을 그대로 드롭다운으로 선택 (2026-07-24 사용자 지정)
  contactPhone: string; // 담당자 연락처
  visitDate: string;
  status: 'done' | 'scheduled';
  keyMemos: string[];
  questions: string[];
  address: string; // 업체 주소 — 장소검색으로 채움
  lat: number | null;
  lng: number | null;
  // backend는 attachment 테이블, link_type='consult'로 매핑 (0003_wedding.sql 참조).
  photos: PhotoPlaceholder[];
}

export interface HoneymoonDay {
  id: string;
  dayNumber: number; // 표시 순서 겸 일차 번호 — 추가/삭제/순서변경 시 1..n으로 재계산
  title: string;
  detail: string; // 메모
  photos: PhotoPlaceholder[];
  budget: {
    plannedAmount: number;
    usedAmount: number;
    method: PaymentMethod | null;
    memo: string;
  };
}

export interface Honeymoon {
  destination: string;
  startDate: string;
  endDate: string;
  days: HoneymoonDay[];
}
