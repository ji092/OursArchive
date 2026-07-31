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
// 일정 레코드를 지울 때 반드시 같이 호출한다. schedule_ack/schedule_comment는 소스가 4개
// 테이블로 갈라지는 폴리모픽 참조라 FK 캐스케이드가 걸리지 않는다 — 안 지우면 삭제된 일정에
// 대해 run_schedule_reminders()가 계속 티어를 올리며 푸시를 보낸다.
// 참고: schedule_comment는 RLS상 "작성자 본인 또는 master"만 지울 수 있어, partner가 지운
// 일정에 master가 단 댓글은 행으로 남는다. 화면에 노출되지 않는 고아 행이라 무해하다.
export async function deleteScheduleAck(sourceType: ScheduleSourceType, sourceId: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_ack')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);
  if (error) throw error;

  await supabase.from('schedule_comment').delete().eq('source_type', sourceType).eq('source_id', sourceId);
}

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
