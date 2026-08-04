// DB 설계(backend/migrations/0004_pregnancy_baby.sql)와 짝을 맞춘 프론트 타입.
type Visibility = 'couple' | 'family' | 'guest';

export interface PregnancyDiary {
  id: string;
  weekNo: number;
  title: string;
  body: string;
  isUltrasound: boolean;
  recordedAt: string; // ISO date
  visibility: Visibility;
  gradient: string; // imageUrl이 없을 때 자리를 채우는 임시 배경 (love 도메인과 동일 패턴)
  // 사진 URL. 조회 경로가 아직 diary_photo를 읽지 않아 항상 undefined다.
  // RecordThumbnail이 있으면 img, 없으면 gradient를 그린다.
  imageUrl?: string;
  comments: { id: string; authorName: string; body: string }[];
}

type CheckupStatus = 'done' | 'upcoming';

export interface Checkup {
  id: string;
  weekNo: number;
  title: string;
  hospital: string;
  doctor: string;
  scheduledAt: string; // ISO
  status: CheckupStatus;
  note?: string; // 방문 전 안내 (예: "성별 확인 가능")
  resultMemo?: string;
  resultWeight?: number;
}

// 검진(Checkup)과 별개의 일반 일정 — 결혼(하나가) 챕터의 schedule_attr과 동일한 개념을 임신 챕터용으로.
export type PregnancyEventType = '태교' | '모임' | '쇼핑' | '기타';

export interface PregnancyEvent {
  id: string;
  title: string;
  eventType: PregnancyEventType;
  scheduledAt: string; // ISO
  location: string;
}

// 지불(가계부) 카테고리 — 실제 육아 가계부 앱·서식 조사(2026-07-27) 기반. 임신·출산·육아 지출을
// 병원비/보험/조리원/준비물/소모품/육아용품으로 나눠 너무 잘게 쪼개지 않으면서도 실사용에 필요한
// 만큼만 구분했다.
export const PREGNANCY_EXPENSE_CATEGORIES = [
  '병원·검진',
  '보험',
  '산후조리원',
  '출산준비물',
  '기저귀·물티슈',
  '분유·이유식',
  '아기옷·용품',
  '예방접종·약',
  '산모용품',
  '기타',
] as const;
export type PregnancyExpenseCategory = (typeof PREGNANCY_EXPENSE_CATEGORIES)[number];

// Master·파트너(부부)만 볼 수 있다 — checkup/health_log와 동일하게 family/guest에게 열지 않는다
// (0004_pregnancy_baby_policies.sql의 can_access_couple_content, 2026-07-27 사용자 지정).
export interface PregnancyExpense {
  id: string;
  category: PregnancyExpenseCategory;
  amount: number;
  date: string; // ISO date
  memo: string;
}

export interface HealthLog {
  id: string;
  loggedAt: string; // ISO date
  weight?: number;
  bloodPressure?: string;
  symptom?: string;
  fetalMovementCount?: number;
}

export interface WeekContent {
  weekNo: number;
  sizeMetaphor: string;
  weightG?: number;
  lengthCm?: number;
  development: string;
  motherTip: string;
}
