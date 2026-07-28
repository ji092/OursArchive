import { mockConsultNotes, mockHoneymoon, mockPrepItems } from './mockWeddingData';
import { WEDDING_CATEGORIES, type ConsultNote, type Honeymoon, type HoneymoonDay, type PaymentDetail, type PrepItem, type WeddingEventType } from './types';

// GET/POST /wedding/*(API 명세 6.4)가 아직 연결되지 않았다. localStorage를 임시 서버로 쓴다
// (src/features/love/api.ts와 동일한 패턴 — 실제 연동 시 이 파일 내부만 Supabase 호출로 교체).
const PREP_ITEMS_KEY = 'ours-archive:wedding-prep-items';
const CONSULT_NOTES_KEY = 'ours-archive:wedding-consult-notes';
const HONEYMOON_KEY = 'ours-archive:wedding-honeymoon';

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// budget 필드 모양이 개발 중 두 차례 바뀌었다({plannedAmount,usedAmount} → 계약금/중도금/잔금 평면 숫자
// 추가 → {amount,method,memo} 중첩 객체로 재구성). 이미 localStorage에 저장된 이전 형태 데이터를 읽을 때
// 깨지지 않도록 항상 최신 shape로 보정한다.
function normalizePaymentDetail(value: unknown, legacyAmount?: unknown): PaymentDetail {
  if (value && typeof value === 'object' && 'amount' in (value as Record<string, unknown>)) {
    const v = value as Partial<PaymentDetail>;
    return { amount: v.amount ?? 0, method: v.method ?? null, memo: v.memo ?? '' };
  }
  const amount = typeof legacyAmount === 'number' ? legacyAmount : typeof value === 'number' ? value : 0;
  return { amount, method: null, memo: '' };
}

function normalizeBudget(budget: unknown): PrepItem['budget'] {
  if (!budget || typeof budget !== 'object') return undefined;
  const b = budget as Record<string, unknown>;
  return {
    plannedAmount: typeof b.plannedAmount === 'number' ? b.plannedAmount : 0,
    deposit: normalizePaymentDetail(b.deposit, b.depositAmount),
    interim: normalizePaymentDetail(b.interim, b.interimAmount),
    balance: normalizePaymentDetail(b.balance, b.balanceAmount),
    usedAmount: typeof b.usedAmount === 'number' ? b.usedAmount : 0,
  };
}

function normalizePrepItem(item: PrepItem): PrepItem {
  return { ...item, budget: normalizeBudget(item.budget) };
}

export async function fetchPrepItems(): Promise<PrepItem[]> {
  const items = readJson(PREP_ITEMS_KEY, mockPrepItems);
  return items.map(normalizePrepItem);
}

export interface CreatePrepItemInput {
  title: string;
  category: PrepItem['category'];
  assigneeName: string | null;
  checklist?: { dueDate: string };
  schedule?: { scheduledAt: string; location: string; eventType: WeddingEventType };
  budget?: PrepItem['budget'];
  consultNoteIds?: string[];
}

export async function createPrepItem(input: CreatePrepItemInput): Promise<PrepItem> {
  const item: PrepItem = {
    id: crypto.randomUUID(),
    title: input.title,
    category: input.category,
    assigneeName: input.assigneeName,
    checklist: input.checklist ? { done: false, dueDate: input.checklist.dueDate } : undefined,
    schedule: input.schedule,
    budget: input.budget,
    consultNoteIds: input.consultNoteIds ?? [],
  };
  const items = await fetchPrepItems();
  writeJson(PREP_ITEMS_KEY, [item, ...items]);
  return item;
}

export interface UpdatePrepItemInput {
  id: string;
  patch: Partial<Omit<PrepItem, 'id'>>;
}

export async function updatePrepItem({ id, patch }: UpdatePrepItemInput): Promise<void> {
  const items = await fetchPrepItems();
  writeJson(
    PREP_ITEMS_KEY,
    items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

export async function deletePrepItem(id: string): Promise<void> {
  const items = await fetchPrepItems();
  writeJson(
    PREP_ITEMS_KEY,
    items.filter((item) => item.id !== id),
  );
}

export async function toggleChecklistDone(id: string): Promise<void> {
  const items = await fetchPrepItems();
  writeJson(
    PREP_ITEMS_KEY,
    items.map((item) => (item.id === id && item.checklist ? { ...item, checklist: { ...item.checklist, done: !item.checklist.done } } : item)),
  );
}

// photos/address/lat/lng 필드도 이번 세션에서 추가됐고 vendorType은 자유 텍스트에서 카테고리
// 드롭다운으로 바뀌었다 — 이전에 저장된 데이터를 보정한다.
function normalizeConsultNote(note: ConsultNote): ConsultNote {
  return {
    ...note,
    vendorType: WEDDING_CATEGORIES.includes(note.vendorType) ? note.vendorType : '기타',
    contactPhone: note.contactPhone ?? '',
    address: note.address ?? '',
    lat: note.lat ?? null,
    lng: note.lng ?? null,
    photos: Array.isArray(note.photos) ? note.photos : [],
  };
}

export async function fetchConsultNotes(): Promise<ConsultNote[]> {
  const notes = readJson(CONSULT_NOTES_KEY, mockConsultNotes);
  return notes.map(normalizeConsultNote);
}

export interface CreateConsultNoteInput {
  vendorName: string;
  vendorType: ConsultNote['vendorType'];
  contactPhone: string;
  visitDate: string;
  status: ConsultNote['status'];
  keyMemos: string[];
  questions: string[];
  address: string;
  lat: number | null;
  lng: number | null;
  photos: ConsultNote['photos'];
}

export async function createConsultNote(input: CreateConsultNoteInput): Promise<ConsultNote> {
  const note: ConsultNote = { id: crypto.randomUUID(), ...input };
  const notes = await fetchConsultNotes();
  writeJson(CONSULT_NOTES_KEY, [note, ...notes]);
  return note;
}

export interface UpdateConsultNoteInput {
  id: string;
  patch: Partial<Omit<ConsultNote, 'id'>>;
}

export async function updateConsultNote({ id, patch }: UpdateConsultNoteInput): Promise<void> {
  const notes = await fetchConsultNotes();
  writeJson(
    CONSULT_NOTES_KEY,
    notes.map((note) => (note.id === id ? { ...note, ...patch } : note)),
  );
}

// honeymoon_day도 이번 세션에서 필드(id/photos/budget)가 추가됐다 — 이전에 저장된 데이터를 보정한다.
function normalizeHoneymoonDay(day: HoneymoonDay, index: number): HoneymoonDay {
  return {
    id: day.id ?? crypto.randomUUID(),
    dayNumber: day.dayNumber ?? index + 1,
    title: day.title ?? '',
    detail: day.detail ?? '',
    photos: Array.isArray(day.photos) ? day.photos : [],
    budget: day.budget ?? { plannedAmount: 0, usedAmount: 0, method: null, memo: '' },
  };
}

export async function fetchHoneymoon(): Promise<Honeymoon> {
  const honeymoon = readJson(HONEYMOON_KEY, mockHoneymoon);
  return { ...honeymoon, days: honeymoon.days.map(normalizeHoneymoonDay) };
}

export async function updateHoneymoon(honeymoon: Honeymoon): Promise<Honeymoon> {
  writeJson(HONEYMOON_KEY, honeymoon);
  return honeymoon;
}

// 실제 파일은 R2 연동 전까지 업로드하지 않으므로 선택한 개수만큼 표시용 그라디언트를 생성한다
// (src/features/love/api.ts PHOTO_GRADIENTS와 동일 관례).
const DAY_PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #f6c98d, #f19a8e)',
  'linear-gradient(135deg, #9fd4e0, #d7ecf0)',
  'linear-gradient(135deg, #efe3d6, #d9cfc2)',
  'linear-gradient(135deg, #d8c9ec, #f0e6f5)',
];

export function photoCountToGradients(count: number): { gradient: string }[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({ gradient: DAY_PHOTO_GRADIENTS[i % DAY_PHOTO_GRADIENTS.length] }));
}
