import { supabase } from '@/shared/lib/api/supabaseClient';
import type { AckRole, ScheduleSourceType } from './types';

export interface CreateScheduleAckInput {
  sourceType: ScheduleSourceType;
  sourceId: string;
  workspaceId: string;
  createdBy: string;
  ackRole: AckRole;
}

// 일정 row를 만든 직후 별도로 호출한다 — 실패해도 일정 자체는 이미 저장돼 있으므로 치명적이지
// 않다(리마인더만 안 걸릴 뿐). upsert라 일정 수정 시 ack_role을 바꿔도 reminder_tier/acknowledged_at은
// 그대로 유지된다(둘 다 payload에 없어서 on conflict update 대상이 아님).
export async function createScheduleAck(input: CreateScheduleAckInput): Promise<void> {
  const { error } = await supabase.from('schedule_ack').upsert(
    {
      source_type: input.sourceType,
      source_id: input.sourceId,
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      ack_role: input.ackRole,
    },
    { onConflict: 'source_type,source_id' },
  );
  if (error) throw error;
}
