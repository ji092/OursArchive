import { supabase } from '@/shared/lib/api/supabaseClient';
import type { ScheduleComment, ScheduleSourceType } from './types';

// 기존 comment 테이블(기록 게시물용)과 완전히 분리된 schedule_comment를 쓴다 — CLAUDE.md 폴더 규칙상
// love/wedding/pregnancy 챕터가 서로 직접 import할 수 없어서, 이 API를 shared에 둔다.
export async function fetchScheduleComments(sourceType: ScheduleSourceType, sourceId: string): Promise<ScheduleComment[]> {
  const { data, error } = await supabase
    .from('schedule_comment')
    .select('id, author_id, body, created_at')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const authorIds = Array.from(new Set(data.map((c) => c.author_id)));
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, nickname, name').in('id', authorIds);
  if (profileError) throw profileError;
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.nickname ?? p.name ?? '익명']));

  return data.map((c) => ({
    id: c.id,
    authorId: c.author_id,
    authorName: nameById.get(c.author_id) ?? '익명',
    body: c.body,
    createdAt: c.created_at,
  }));
}

export interface AddScheduleCommentInput {
  sourceType: ScheduleSourceType;
  sourceId: string;
  workspaceId: string;
  authorId: string;
  body: string;
}

export async function addScheduleComment(input: AddScheduleCommentInput): Promise<void> {
  const { error } = await supabase.from('schedule_comment').insert({
    source_type: input.sourceType,
    source_id: input.sourceId,
    workspace_id: input.workspaceId,
    author_id: input.authorId,
    body: input.body,
  });
  if (error) throw error;
}

export async function deleteScheduleComment(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_comment').delete().eq('id', id);
  if (error) throw error;
}
