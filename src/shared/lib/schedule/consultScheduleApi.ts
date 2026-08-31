import { supabase } from '@/shared/lib/api/supabaseClient';
import type { ConsultScheduleEvent } from './consultScheduleEvents';

// 달력에 필요한 컬럼만 읽는다(사진/메모/질문은 결혼 챕터 상세에서만 쓰므로 제외).
// 접근 통제는 consult_note RLS가 그대로 판정한다 — 권한이 없는 사용자에게는 빈 배열이 온다.
export async function fetchConsultScheduleEvents(workspaceId: string): Promise<ConsultScheduleEvent[]> {
  const { data, error } = await supabase
    .from('consult_note')
    .select('id, vendor_name, vendor_type, visit_date, status, address')
    .eq('workspace_id', workspaceId)
    .not('visit_date', 'is', null)
    .order('visit_date', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((n) => ({
    id: n.id,
    vendorName: n.vendor_name,
    vendorType: n.vendor_type,
    visitDate: n.visit_date,
    status: n.status,
    address: n.address ?? '',
  }));
}
