import { supabase } from '@/shared/lib/api/supabaseClient';

// workspace 테이블(backend/migrations/0001_init.sql + 0014_workspace_first_met_date.sql)의
// first_met_date/couple_start_date/wedding_date/due_date와 짝을 맞춘 설정.
// 대시보드·연애·결혼·임신 여러 챕터가 함께 쓰는 값이라 shared에 둔다
// (CLAUDE.md 폴더 규칙 "챕터 간 직접 import 금지 — 공유 필요 시 shared로 승격").
export interface WorkspaceSettings {
  firstMetDate: string | null; // 시작 · 첫만남 (기록용, 계산에 쓰이지 않음)
  coupleStartDate: string | null; // 함께 · 만나기로 한 날 (D+ 계산 기준)
  weddingDate: string | null; // 하나가 · 결혼 날짜
  dueDate: string | null; // 셋이 · 출산일
}

export async function fetchWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  const { data, error } = await supabase
    .from('workspace')
    .select('first_met_date, couple_start_date, wedding_date, due_date')
    .eq('id', workspaceId)
    .single();
  if (error) throw error;
  return {
    firstMetDate: data.first_met_date,
    coupleStartDate: data.couple_start_date,
    weddingDate: data.wedding_date,
    dueDate: data.due_date,
  };
}

export async function updateWorkspaceSettings(workspaceId: string, settings: WorkspaceSettings): Promise<void> {
  const { error } = await supabase
    .from('workspace')
    .update({
      first_met_date: settings.firstMetDate,
      couple_start_date: settings.coupleStartDate,
      wedding_date: settings.weddingDate,
      due_date: settings.dueDate,
    })
    .eq('id', workspaceId);
  if (error) throw error;
}
