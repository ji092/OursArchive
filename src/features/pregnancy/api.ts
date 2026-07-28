import { mockCheckups, mockDiaries, mockEvents, mockExpenses, mockWeekContent } from './mockPregnancyData';
import type { Checkup, PregnancyDiary, PregnancyEvent, PregnancyExpense } from './types';

// GET/POST /pregnancy/*(API 명세 6.5)가 아직 연결되지 않았다. localStorage를 임시 서버로 쓴다
// (src/features/love/api.ts와 동일한 패턴).
const DIARIES_KEY = 'ours-archive:pregnancy-diaries';
const CHECKUPS_KEY = 'ours-archive:pregnancy-checkups';
const EVENTS_KEY = 'ours-archive:pregnancy-events';
const EXPENSES_KEY = 'ours-archive:pregnancy-expenses';

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

export async function fetchDiaries(): Promise<PregnancyDiary[]> {
  const diaries = readJson(DIARIES_KEY, mockDiaries);
  return [...diaries].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
}

export interface CreateDiaryInput {
  weekNo: number;
  title: string;
  body: string;
  isUltrasound: boolean;
  recordedAt: string;
  visibility: PregnancyDiary['visibility'];
}

const DIARY_GRADIENTS = [
  'linear-gradient(135deg, #d8c9ec, #f0e6f5)',
  'linear-gradient(135deg, #9fd4e0, #d7ecf0)',
  'linear-gradient(135deg, #f6c98d, #f19a8e)',
];

export async function createDiary(input: CreateDiaryInput): Promise<PregnancyDiary> {
  const diary: PregnancyDiary = {
    id: crypto.randomUUID(),
    ...input,
    gradient: DIARY_GRADIENTS[Math.floor(Math.random() * DIARY_GRADIENTS.length)],
    comments: [],
  };
  const diaries = await fetchDiaries();
  writeJson(DIARIES_KEY, [diary, ...diaries]);
  return diary;
}

export interface AddDiaryCommentInput {
  diaryId: string;
  authorName: string;
  body: string;
}

export async function addDiaryComment({ diaryId, authorName, body }: AddDiaryCommentInput): Promise<void> {
  const diaries = await fetchDiaries();
  writeJson(
    DIARIES_KEY,
    diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, comments: [...diary.comments, { id: crypto.randomUUID(), authorName, body }] } : diary,
    ),
  );
}

export interface DeleteDiaryCommentInput {
  diaryId: string;
  commentId: string;
}

export async function deleteDiaryComment({ diaryId, commentId }: DeleteDiaryCommentInput): Promise<void> {
  const diaries = await fetchDiaries();
  writeJson(
    DIARIES_KEY,
    diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, comments: diary.comments.filter((c) => c.id !== commentId) } : diary,
    ),
  );
}

export async function fetchCheckups(): Promise<Checkup[]> {
  const checkups = readJson(CHECKUPS_KEY, mockCheckups);
  return [...checkups].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export async function fetchWeekContent(weekNo: number) {
  return mockWeekContent[weekNo] ?? null;
}

export async function fetchEvents(): Promise<PregnancyEvent[]> {
  const events = readJson(EVENTS_KEY, mockEvents);
  return [...events].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export interface CreateEventInput {
  title: string;
  eventType: PregnancyEvent['eventType'];
  scheduledAt: string;
  location: string;
}

export async function createEvent(input: CreateEventInput): Promise<PregnancyEvent> {
  const event: PregnancyEvent = { id: crypto.randomUUID(), ...input };
  const events = await fetchEvents();
  writeJson(EVENTS_KEY, [event, ...events]);
  return event;
}

export async function fetchExpenses(): Promise<PregnancyExpense[]> {
  const expenses = readJson(EXPENSES_KEY, mockExpenses);
  return [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface CreateExpenseInput {
  category: PregnancyExpense['category'];
  amount: number;
  date: string;
  memo: string;
}

export async function createExpense(input: CreateExpenseInput): Promise<PregnancyExpense> {
  const expense: PregnancyExpense = { id: crypto.randomUUID(), ...input };
  const expenses = await fetchExpenses();
  writeJson(EXPENSES_KEY, [expense, ...expenses]);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const expenses = await fetchExpenses();
  writeJson(
    EXPENSES_KEY,
    expenses.filter((e) => e.id !== id),
  );
}
