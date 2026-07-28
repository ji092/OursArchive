// localStorage가 비어있을 때(신규 브라우저/배포 도메인)의 최초 fallback — 실사용 데이터가 아니므로 빈 상태로 둔다
// (2026-07-28: 배포 도메인에서 옛 목데이터가 그대로 노출되던 문제를 계기로 전부 비움).
export interface LoveRecordComment {
  id: string;
  authorName: string;
  body: string;
}

export interface LoveRecord {
  id: string;
  authorName: string;
  placeName: string;
  lat?: number;
  lng?: number;
  body: string;
  recordedAt: string; // ISO 8601
  photos: { gradient: string; imageUrl?: string }[];
  comments: LoveRecordComment[];
}

export const mockLoveRecords: LoveRecord[] = [];
