// workspace 테이블(backend/migrations/0001_init.sql)의 couple_start_date/wedding_date/due_date와
// 짝을 맞춘 설정. GET/PATCH /workspaces/:id(API 명세에 아직 없음)가 연결되기 전까지 localStorage를
// 임시 서버로 쓴다. 대시보드·연애·결혼·임신 여러 챕터가 함께 쓰는 값이라 shared에 둔다
// (CLAUDE.md 폴더 규칙 "챕터 간 직접 import 금지 — 공유 필요 시 shared로 승격").
export interface WorkspaceSettings {
  firstMetDate: string; // 시작 · 첫만남 (기록용, 계산에 쓰이지 않음)
  coupleStartDate: string; // 함께 · 만나기로 한 날 (D+ 계산 기준)
  weddingDate: string; // 하나가 · 결혼 날짜
  dueDate: string; // 셋이 · 출산일
}

const KEY = 'ours-archive:workspace-settings';

const DEFAULTS: WorkspaceSettings = {
  firstMetDate: '2025-03-20',
  coupleStartDate: '2025-04-15',
  weddingDate: '2027-04-12',
  dueDate: '2026-12-24',
};

export async function fetchWorkspaceSettings(): Promise<WorkspaceSettings> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) } as WorkspaceSettings;
  } catch {
    return DEFAULTS;
  }
}

export async function updateWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
  localStorage.setItem(KEY, JSON.stringify(settings));
  return settings;
}
