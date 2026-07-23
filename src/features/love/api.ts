import { mockLoveRecords, type LoveRecord } from './mockLoveRecords';

// GET/POST /love/records(API 명세 6.3)가 아직 연결되지 않았다. 실제 Supabase 연동 전까지 이 파일이
// "서버" 역할을 대신한다 — localStorage에 저장해 새로고침해도 남게 하고, 훅(useLoveRecords 등)은
// 이 파일에서만 데이터를 가져오게 해 CLAUDE.md의 "features/*/api.ts 외 직접 fetch 금지" 원칙을
// 지금 단계에서도 지킨다. 실제 연동 시 이 파일 내부 구현만 Supabase 호출로 바꾸면 훅/컴포넌트는 그대로.
const STORAGE_KEY = 'ours-archive:love-records';

function readStorage(): LoveRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return mockLoveRecords;
  try {
    return JSON.parse(raw) as LoveRecord[];
  } catch {
    return mockLoveRecords;
  }
}

function writeStorage(records: LoveRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function fetchLoveRecords(): Promise<LoveRecord[]> {
  const records = readStorage();
  return [...records].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
}

export interface CreateLoveRecordInput {
  authorName: string;
  body: string;
  placeName: string;
  lat?: number;
  lng?: number;
  recordedAt: string; // ISO 8601
  photoCount: number; // 실제 파일은 아직 업로드하지 않으므로 개수만 반영해 표시용 그라디언트를 생성한다
}

const PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #f6c98d, #f19a8e)',
  'linear-gradient(135deg, #9fd4e0, #d7ecf0)',
  'linear-gradient(135deg, #efe3d6, #d9cfc2)',
  'linear-gradient(135deg, #d8c9ec, #f0e6f5)',
];

export async function createLoveRecord(input: CreateLoveRecordInput): Promise<LoveRecord> {
  const photoCount = Math.min(Math.max(input.photoCount, 0), 10);
  const record: LoveRecord = {
    id: crypto.randomUUID(),
    authorName: input.authorName,
    placeName: input.placeName,
    lat: input.lat,
    lng: input.lng,
    body: input.body,
    recordedAt: input.recordedAt,
    photos: Array.from({ length: photoCount }, (_, i) => ({
      gradient: PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length],
    })),
    comments: [],
  };

  const records = readStorage();
  writeStorage([record, ...records]);
  return record;
}

export interface AddLoveCommentInput {
  recordId: string;
  authorName: string;
  body: string;
}

export async function addLoveComment({ recordId, authorName, body }: AddLoveCommentInput): Promise<void> {
  const records = readStorage();
  const updated = records.map((record) =>
    record.id === recordId
      ? { ...record, comments: [...record.comments, { id: crypto.randomUUID(), authorName, body }] }
      : record,
  );
  writeStorage(updated);
}

export interface DeleteLoveCommentInput {
  recordId: string;
  commentId: string;
}

export async function deleteLoveComment({ recordId, commentId }: DeleteLoveCommentInput): Promise<void> {
  const records = readStorage();
  const updated = records.map((record) =>
    record.id === recordId
      ? { ...record, comments: record.comments.filter((comment) => comment.id !== commentId) }
      : record,
  );
  writeStorage(updated);
}
