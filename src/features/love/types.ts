// backend/migrations/0002_love.sql(love_record/love_photo/comment/love_plan)와 짝을 맞춘 프론트 타입.
export interface LoveRecordComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
}

interface LoveRecordPhoto {
  path: string; // content-photos 버킷 안 경로 (backend/policies/0011_content_photos_storage.sql)
  gradient: string; // signed URL 로딩 전 임시 배경
  imageUrl?: string; // resolveContentPhotoUrls로 채워지는 signed URL
}

export interface LoveRecord {
  id: string;
  authorId: string;
  authorName: string;
  placeName: string;
  lat?: number;
  lng?: number;
  body: string;
  recordedAt: string; // ISO 8601
  photos: LoveRecordPhoto[];
  comments: LoveRecordComment[];
}

export interface LovePlan {
  id: string;
  title: string;
  plannedAt: string; // ISO date (yyyy-mm-dd, LoveCalendarView가 이 형식으로 매칭)
  plannedAtFull: string; // ISO 8601 (시간 포함, 상세 표시용)
  placeName?: string;
}
