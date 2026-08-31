// DB 설계(backend/migrations/0003_wedding.sql)와 짝을 맞춘 프론트 타입.
// prep_item + checklist_attr/schedule_attr/budget_attr을 프론트에서는 하나의 객체로 합쳐서 다룬다
// (API 명세 6.4의 통합 생성 예시와 동일한 모양) — 실제 연동 시에도 API 응답 shape가 이와 같다.
export type WeddingCategory = '웨딩홀' | '스드메' | '예물예단' | '청첩장' | '혼수' | '신혼여행' | '기타';
export const WEDDING_CATEGORIES: WeddingCategory[] = ['웨딩홀', '스드메', '예물예단', '청첩장', '신혼여행', '혼수', '기타'];
export type WeddingEventType = '상담' | '계약' | '청첩장모임' | '본식' | '기타';
export type PaymentMethod = '카드' | '현금';

// 계약금/중도금/잔금 각각의 지출 방식 — 카드/현금 선택 + 자유 메모(예: "현대카드", "계좌이체", "인출").
interface PaymentDetail {
  amount: number;
  method: PaymentMethod | null;
  memo: string;
}

export interface PrepItem {
  id: string;
  title: string;
  category: WeddingCategory;
  assigneeId: string | null; // profiles.id, null = "함께" (backend assignee_id FK 설계, DECISIONS.md 2026-07-22 참조)
  assigneeName: string | null; // 표시용 — assigneeId로부터 조회 시점에 채운다
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

// content-photos 버킷 안 경로(path) + signed URL(imageUrl, 조회 시점에 resolveContentPhotoUrls로 채움) +
// 로딩 전 임시 배경(gradient). 상담노트/신혼여행 일정 등 여러 곳에서 공용으로 쓴다.
interface PhotoPlaceholder {
  path: string;
  gradient: string;
  imageUrl?: string;
}

export interface ConsultNote {
  id: string;
  vendorName: string;
  vendorType: WeddingCategory; // 체크리스트와 같은 카테고리 목록을 그대로 드롭다운으로 선택 (2026-07-24 사용자 지정)
  contactPhone: string; // 담당자 연락처
  visitDate: string;
  visitTime: string | null; // 'HH:MM' — 상담노트가 곧 상담 일정이라 시각까지 받는다(2026-08-31). null이면 시간 미정.
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

// 업체 연락처(vendor_contact, 0003_wedding.sql) — 상담노트와 별개로 "담당자·연락처·계약정보"만
// 간단히 관리하는 명단. consultNoteId로 상담노트 1건과 선택적으로 연결.
export interface VendorContact {
  id: string;
  vendorName: string;
  category: WeddingCategory | null; // 상담노트에서 자동 생성될 때 노트의 항목을 그대로 받는다(2026-09-01)
  managerName: string;
  phone: string;
  contractInfo: string;
  consultNoteId: string | null;
}

type ExpenseStatus = 'planned' | 'paid';

// 지출(expense, 0003_wedding.sql) — budget_attr(항목별 예산)과 별개로, prep_item에 안 묶인
// 단독 지출까지 자유롭게 기록하는 가계부. prepItemId는 선택(연결 안 해도 됨).
export interface Expense {
  id: string;
  category: WeddingCategory;
  amount: number;
  status: ExpenseStatus;
  prepItemId: string | null;
}
