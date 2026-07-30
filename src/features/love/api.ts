import { supabase } from '@/shared/lib/api/supabaseClient';
import { deleteContentPhotos, resolveContentPhotoUrls, uploadContentPhotos } from '@/shared/lib/storage/uploadContentPhotos';
import type { LovePlan, LoveRecord, LoveRecordComment } from './types';

// backend/policies/0002_love_policies.sql이 이미 love_record/love_photo/comment/love_plan을
// couple(master/partner) 전용으로 막고 있으므로 여기선 별도 권한 체크 없이 그대로 호출한다.
const PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #f6c98d, #f19a8e)',
  'linear-gradient(135deg, #9fd4e0, #d7ecf0)',
  'linear-gradient(135deg, #efe3d6, #d9cfc2)',
  'linear-gradient(135deg, #d8c9ec, #f0e6f5)',
];

export async function fetchLoveRecords(workspaceId: string): Promise<LoveRecord[]> {
  const { data: records, error } = await supabase
    .from('love_record')
    .select('id, author_id, body, place_name, place_lat, place_lng, recorded_at, love_photo(url, sort_order)')
    .eq('workspace_id', workspaceId)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  if (!records || records.length === 0) return [];

  const recordIds = records.map((r) => r.id);
  const { data: comments, error: commentError } = await supabase
    .from('comment')
    .select('id, target_id, author_id, body, created_at')
    .eq('target_type', 'love_record')
    .in('target_id', recordIds)
    .order('created_at', { ascending: true });
  if (commentError) throw commentError;

  const authorIds = Array.from(new Set([...records.map((r) => r.author_id), ...(comments ?? []).map((c) => c.author_id)]));
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, nickname, name').in('id', authorIds);
  if (profileError) throw profileError;
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.nickname ?? p.name ?? '익명']));

  const allPaths = records.flatMap((r) => (r.love_photo ?? []).map((p) => p.url));
  const urlByPath = await resolveContentPhotoUrls(allPaths);

  const commentsByRecord = new Map<string, LoveRecordComment[]>();
  for (const c of comments ?? []) {
    const list = commentsByRecord.get(c.target_id) ?? [];
    list.push({ id: c.id, authorId: c.author_id, authorName: nameById.get(c.author_id) ?? '익명', body: c.body });
    commentsByRecord.set(c.target_id, list);
  }

  return records.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: nameById.get(r.author_id) ?? '익명',
    placeName: r.place_name,
    lat: r.place_lat ?? undefined,
    lng: r.place_lng ?? undefined,
    body: r.body,
    recordedAt: r.recorded_at,
    photos: [...(r.love_photo ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p, i) => ({ path: p.url, gradient: PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length], imageUrl: urlByPath[p.url] })),
    comments: commentsByRecord.get(r.id) ?? [],
  }));
}

export interface CreateLoveRecordInput {
  workspaceId: string;
  authorId: string;
  body: string;
  placeName: string;
  lat?: number;
  lng?: number;
  recordedAt: string; // ISO 8601
  photoFiles: File[];
}

export async function createLoveRecord(input: CreateLoveRecordInput): Promise<void> {
  const { data: record, error } = await supabase
    .from('love_record')
    .insert({
      workspace_id: input.workspaceId,
      author_id: input.authorId,
      body: input.body,
      place_name: input.placeName,
      place_lat: input.lat ?? null,
      place_lng: input.lng ?? null,
      recorded_at: input.recordedAt,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (input.photoFiles.length > 0) {
    const paths = await uploadContentPhotos(input.workspaceId, 'love_record', record.id, input.photoFiles);
    const { error: photoError } = await supabase
      .from('love_photo')
      .insert(paths.map((url, i) => ({ record_id: record.id, url, sort_order: i })));
    if (photoError) throw photoError;
  }
}

export interface UpdateLoveRecordInput {
  id: string;
  workspaceId: string;
  body: string;
  placeName: string;
  lat?: number;
  lng?: number;
  recordedAt: string;
  removedPhotoPaths: string[];
  newPhotoFiles: File[];
}

export async function updateLoveRecord(input: UpdateLoveRecordInput): Promise<void> {
  const { error } = await supabase
    .from('love_record')
    .update({
      body: input.body,
      place_name: input.placeName,
      place_lat: input.lat ?? null,
      place_lng: input.lng ?? null,
      recorded_at: input.recordedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);
  if (error) throw error;

  if (input.removedPhotoPaths.length > 0) {
    await supabase.from('love_photo').delete().eq('record_id', input.id).in('url', input.removedPhotoPaths);
    await deleteContentPhotos(input.removedPhotoPaths);
  }

  if (input.newPhotoFiles.length > 0) {
    const { count } = await supabase
      .from('love_photo')
      .select('*', { count: 'exact', head: true })
      .eq('record_id', input.id);
    const paths = await uploadContentPhotos(input.workspaceId, 'love_record', input.id, input.newPhotoFiles);
    const startOrder = count ?? 0;
    const { error: photoError } = await supabase
      .from('love_photo')
      .insert(paths.map((url, i) => ({ record_id: input.id, url, sort_order: startOrder + i })));
    if (photoError) throw photoError;
  }
}

export async function deleteLoveRecord(id: string): Promise<void> {
  const { data: photos } = await supabase.from('love_photo').select('url').eq('record_id', id);
  const { error } = await supabase.from('love_record').delete().eq('id', id);
  if (error) throw error;
  if (photos && photos.length > 0) {
    await deleteContentPhotos(photos.map((p) => p.url)).catch(() => {});
  }
}

export interface AddLoveCommentInput {
  recordId: string;
  authorId: string;
  body: string;
}

export async function addLoveComment({ recordId, authorId, body }: AddLoveCommentInput): Promise<void> {
  const { error } = await supabase
    .from('comment')
    .insert({ target_type: 'love_record', target_id: recordId, author_id: authorId, body });
  if (error) throw error;
}

export async function deleteLoveComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comment').delete().eq('id', commentId);
  if (error) throw error;
}

export async function fetchLovePlans(workspaceId: string): Promise<LovePlan[]> {
  const { data, error } = await supabase
    .from('love_plan')
    .select('id, title, planned_at, place_name')
    .eq('workspace_id', workspaceId)
    .order('planned_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    plannedAt: p.planned_at.slice(0, 10),
    plannedAtFull: p.planned_at,
    placeName: p.place_name ?? undefined,
  }));
}

export interface CreateLovePlanInput {
  workspaceId: string;
  title: string;
  placeName?: string;
  plannedAt: string; // ISO 8601
}

export async function createLovePlan(input: CreateLovePlanInput): Promise<void> {
  const { error } = await supabase.from('love_plan').insert({
    workspace_id: input.workspaceId,
    title: input.title,
    place_name: input.placeName ?? null,
    planned_at: input.plannedAt,
  });
  if (error) throw error;
}
