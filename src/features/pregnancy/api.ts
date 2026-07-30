import { supabase } from '@/shared/lib/api/supabaseClient';
import type { Checkup, HealthLog, PregnancyDiary, PregnancyEvent, PregnancyExpense, WeekContent } from './types';

// backend/policies/0009_pregnancy_family_revoke.sql로 family 접근을 이미 회수했으므로
// pregnancy_diary는 항상 visibility='couple'로 쓴다 (2026-07-29 사용자 지정 — "가족 공유" 토글 제거).
const DIARY_GRADIENTS = [
  'linear-gradient(135deg, #d8c9ec, #f0e6f5)',
  'linear-gradient(135deg, #9fd4e0, #d7ecf0)',
  'linear-gradient(135deg, #f6c98d, #f19a8e)',
];

async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, nickname, name').in('id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p.nickname ?? p.name ?? '익명']));
}

export async function fetchDiaries(workspaceId: string): Promise<PregnancyDiary[]> {
  const { data: diaries, error } = await supabase
    .from('pregnancy_diary')
    .select('id, week_no, title, body, is_ultrasound, recorded_at, visibility')
    .eq('workspace_id', workspaceId)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  if (!diaries || diaries.length === 0) return [];

  const diaryIds = diaries.map((d) => d.id);
  const { data: comments, error: commentError } = await supabase
    .from('comment')
    .select('id, target_id, author_id, body, created_at')
    .eq('target_type', 'pregnancy_diary')
    .in('target_id', diaryIds)
    .order('created_at', { ascending: true });
  if (commentError) throw commentError;

  const nameById = await fetchProfileNames(Array.from(new Set((comments ?? []).map((c) => c.author_id))));
  const commentsByDiary = new Map<string, PregnancyDiary['comments']>();
  for (const c of comments ?? []) {
    const list = commentsByDiary.get(c.target_id) ?? [];
    list.push({ id: c.id, authorName: nameById.get(c.author_id) ?? '익명', body: c.body });
    commentsByDiary.set(c.target_id, list);
  }

  return diaries.map((d, i) => ({
    id: d.id,
    weekNo: d.week_no,
    title: d.title,
    body: d.body ?? '',
    isUltrasound: d.is_ultrasound,
    recordedAt: d.recorded_at,
    visibility: d.visibility,
    gradient: DIARY_GRADIENTS[i % DIARY_GRADIENTS.length],
    comments: commentsByDiary.get(d.id) ?? [],
  }));
}

export interface CreateDiaryInput {
  workspaceId: string;
  weekNo: number;
  title: string;
  body: string;
  isUltrasound: boolean;
  recordedAt: string;
}

export async function createDiary(input: CreateDiaryInput): Promise<void> {
  const { error } = await supabase.from('pregnancy_diary').insert({
    workspace_id: input.workspaceId,
    week_no: input.weekNo,
    title: input.title,
    body: input.body,
    is_ultrasound: input.isUltrasound,
    recorded_at: input.recordedAt,
    visibility: 'couple',
  });
  if (error) throw error;
}

export interface AddDiaryCommentInput {
  diaryId: string;
  authorId: string;
  body: string;
}

export async function addDiaryComment({ diaryId, authorId, body }: AddDiaryCommentInput): Promise<void> {
  const { error } = await supabase.from('comment').insert({ target_type: 'pregnancy_diary', target_id: diaryId, author_id: authorId, body });
  if (error) throw error;
}

export async function deleteDiaryComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comment').delete().eq('id', commentId);
  if (error) throw error;
}

export async function fetchCheckups(workspaceId: string): Promise<Checkup[]> {
  const { data, error } = await supabase
    .from('checkup')
    .select('id, week_no, title, hospital, doctor, scheduled_at, status, note, result_memo, result_weight')
    .eq('workspace_id', workspaceId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    weekNo: c.week_no,
    title: c.title,
    hospital: c.hospital,
    doctor: c.doctor ?? '',
    scheduledAt: c.scheduled_at,
    status: c.status,
    note: c.note ?? undefined,
    resultMemo: c.result_memo ?? undefined,
    resultWeight: c.result_weight ?? undefined,
  }));
}

export interface SaveCheckupInput {
  weekNo: number;
  title: string;
  hospital: string;
  doctor: string;
  scheduledAt: string;
  status: Checkup['status'];
  note?: string;
  resultMemo?: string;
  resultWeight?: number;
}

export async function createCheckup(workspaceId: string, input: SaveCheckupInput): Promise<void> {
  const { error } = await supabase.from('checkup').insert({
    workspace_id: workspaceId,
    week_no: input.weekNo,
    title: input.title,
    hospital: input.hospital,
    doctor: input.doctor,
    scheduled_at: input.scheduledAt,
    status: input.status,
    note: input.note ?? null,
    result_memo: input.resultMemo ?? null,
    result_weight: input.resultWeight ?? null,
  });
  if (error) throw error;
}

export async function updateCheckup(id: string, input: SaveCheckupInput): Promise<void> {
  const { error } = await supabase
    .from('checkup')
    .update({
      week_no: input.weekNo,
      title: input.title,
      hospital: input.hospital,
      doctor: input.doctor,
      scheduled_at: input.scheduledAt,
      status: input.status,
      note: input.note ?? null,
      result_memo: input.resultMemo ?? null,
      result_weight: input.resultWeight ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCheckup(id: string): Promise<void> {
  const { error } = await supabase.from('checkup').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchWeekContent(weekNo: number): Promise<WeekContent | null> {
  const { data, error } = await supabase
    .from('week_content')
    .select('week_no, size_metaphor, weight_g, length_cm, development, mother_tip')
    .eq('week_no', weekNo)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    weekNo: data.week_no,
    sizeMetaphor: data.size_metaphor,
    weightG: data.weight_g ?? undefined,
    lengthCm: data.length_cm ?? undefined,
    development: data.development ?? '',
    motherTip: data.mother_tip ?? '',
  };
}

export async function fetchEvents(workspaceId: string): Promise<PregnancyEvent[]> {
  const { data, error } = await supabase
    .from('pregnancy_event')
    .select('id, title, event_type, scheduled_at, location')
    .eq('workspace_id', workspaceId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({ id: e.id, title: e.title, eventType: e.event_type, scheduledAt: e.scheduled_at, location: e.location ?? '' }));
}

export interface SaveEventInput {
  title: string;
  eventType: PregnancyEvent['eventType'];
  scheduledAt: string;
  location: string;
}

export async function createEvent(workspaceId: string, input: SaveEventInput): Promise<void> {
  const { error } = await supabase
    .from('pregnancy_event')
    .insert({ workspace_id: workspaceId, title: input.title, event_type: input.eventType, scheduled_at: input.scheduledAt, location: input.location });
  if (error) throw error;
}

export async function updateEvent(id: string, input: SaveEventInput): Promise<void> {
  const { error } = await supabase
    .from('pregnancy_event')
    .update({ title: input.title, event_type: input.eventType, scheduled_at: input.scheduledAt, location: input.location })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('pregnancy_event').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchExpenses(workspaceId: string): Promise<PregnancyExpense[]> {
  const { data, error } = await supabase
    .from('pregnancy_expense')
    .select('id, category, amount, expense_date, memo')
    .eq('workspace_id', workspaceId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((e) => ({ id: e.id, category: e.category, amount: e.amount, date: e.expense_date, memo: e.memo }));
}

export interface SaveExpenseInput {
  category: PregnancyExpense['category'];
  amount: number;
  date: string;
  memo: string;
}

export async function createExpense(workspaceId: string, input: SaveExpenseInput): Promise<void> {
  const { error } = await supabase
    .from('pregnancy_expense')
    .insert({ workspace_id: workspaceId, category: input.category, amount: input.amount, expense_date: input.date, memo: input.memo });
  if (error) throw error;
}

export async function updateExpense(id: string, input: SaveExpenseInput): Promise<void> {
  const { error } = await supabase
    .from('pregnancy_expense')
    .update({ category: input.category, amount: input.amount, expense_date: input.date, memo: input.memo })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('pregnancy_expense').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchHealthLogs(workspaceId: string): Promise<HealthLog[]> {
  const { data, error } = await supabase
    .from('health_log')
    .select('id, logged_at, weight, blood_pressure, symptom, fetal_movement_count')
    .eq('workspace_id', workspaceId)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((h) => ({
    id: h.id,
    loggedAt: h.logged_at,
    weight: h.weight ?? undefined,
    bloodPressure: h.blood_pressure ?? undefined,
    symptom: h.symptom ?? undefined,
    fetalMovementCount: h.fetal_movement_count ?? undefined,
  }));
}

export interface SaveHealthLogInput {
  loggedAt: string;
  weight?: number;
  bloodPressure?: string;
  symptom?: string;
  fetalMovementCount?: number;
}

export async function createHealthLog(workspaceId: string, input: SaveHealthLogInput): Promise<void> {
  const { error } = await supabase.from('health_log').insert({
    workspace_id: workspaceId,
    logged_at: input.loggedAt,
    weight: input.weight ?? null,
    blood_pressure: input.bloodPressure ?? null,
    symptom: input.symptom ?? null,
    fetal_movement_count: input.fetalMovementCount ?? null,
  });
  if (error) throw error;
}

export async function deleteHealthLog(id: string): Promise<void> {
  const { error } = await supabase.from('health_log').delete().eq('id', id);
  if (error) throw error;
}
