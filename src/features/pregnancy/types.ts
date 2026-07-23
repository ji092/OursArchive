// DB 설계(backend/migrations/0004_pregnancy_baby.sql)와 짝을 맞춘 프론트 타입.
export type Visibility = 'couple' | 'family' | 'guest';

export interface PregnancyDiary {
  id: string;
  weekNo: number;
  title: string;
  body: string;
  isUltrasound: boolean;
  recordedAt: string; // ISO date
  visibility: Visibility;
  gradient: string; // R2 연동 전 임시 표시용 (love 도메인과 동일 패턴)
  comments: { id: string; authorName: string; body: string }[];
}

export type CheckupStatus = 'done' | 'upcoming';

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

export interface WeekContent {
  weekNo: number;
  sizeMetaphor: string;
  weightG?: number;
  lengthCm?: number;
  development: string;
  motherTip: string;
}
