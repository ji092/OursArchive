import { mockConsultNotes, mockHoneymoon, mockPrepItems } from './mockWeddingData';
import type { ConsultNote, Honeymoon, PrepItem, WeddingEventType } from './types';

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

export async function fetchPrepItems(): Promise<PrepItem[]> {
  return readJson(PREP_ITEMS_KEY, mockPrepItems);
}

export interface CreatePrepItemInput {
  title: string;
  category: PrepItem['category'];
  assigneeName: string | null;
  checklist?: { dueDate: string };
  schedule?: { scheduledAt: string; location: string; eventType: WeddingEventType };
  budget?: { plannedAmount: number };
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
    budget: input.budget ? { plannedAmount: input.budget.plannedAmount, usedAmount: 0 } : undefined,
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

export async function fetchConsultNotes(): Promise<ConsultNote[]> {
  return readJson(CONSULT_NOTES_KEY, mockConsultNotes);
}

export interface CreateConsultNoteInput {
  vendorName: string;
  vendorType: string;
  visitDate: string;
  status: ConsultNote['status'];
  keyMemos: string[];
  questions: string[];
}

export async function createConsultNote(input: CreateConsultNoteInput): Promise<ConsultNote> {
  const note: ConsultNote = { id: crypto.randomUUID(), ...input };
  const notes = await fetchConsultNotes();
  writeJson(CONSULT_NOTES_KEY, [note, ...notes]);
  return note;
}

export async function fetchHoneymoon(): Promise<Honeymoon> {
  return readJson(HONEYMOON_KEY, mockHoneymoon);
}

export async function updateHoneymoon(honeymoon: Honeymoon): Promise<Honeymoon> {
  writeJson(HONEYMOON_KEY, honeymoon);
  return honeymoon;
}
