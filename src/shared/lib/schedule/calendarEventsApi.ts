import { supabase } from '@/shared/lib/api/supabaseClient';
import { dateOnlyToStartAt, type CalendarEvent } from './calendarEvents';

// 여섯 곳에 흩어진 일정을 한 번에 읽어 CalendarEvent로 정규화한다.
// 접근 통제는 각 테이블의 RLS(can_access_couple_content)가 그대로 판정한다 — 권한이 없으면 빈 배열.
// 한 소스라도 실패하면 통째로 throw해서 화면이 "일부만 맞는 달력"을 조용히 보여주지 않게 한다.
async function fetchLovePlanEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('love_plan')
    .select('id, title, planned_at, place_name')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    sourceType: 'love_plan' as const,
    sourceId: row.id,
    chapter: 'love' as const,
    title: row.title,
    badge: '데이트',
    startAt: row.planned_at,
    hasTime: true,
    location: row.place_name ?? '',
    linkTo: '/love/calendar',
  }));
}

// 본식 일정은 관리 페이지의 workspace.wedding_date를 따라간다(usePrepItems와 같은 규칙) —
// 달력마다 다른 날짜가 보이지 않도록 여기서도 같은 덮어쓰기를 한다.
async function fetchWeddingScheduleEvents(workspaceId: string, weddingDate: string | null): Promise<CalendarEvent[]> {
  // 필터는 prep_item(기본 테이블)에 걸고 schedule_attr을 inner join으로 붙인다 — 일정이 붙은
  // 항목만 남으면서 workspace 조건이 확실히 적용된다.
  const { data, error } = await supabase
    .from('prep_item')
    .select('id, title, schedule_attr!inner(scheduled_at, location, event_type)')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const attr = (Array.isArray(row.schedule_attr) ? row.schedule_attr[0] : row.schedule_attr) as {
      scheduled_at: string;
      location: string | null;
      event_type: string;
    };
    const scheduledAt =
      attr.event_type === '본식' && weddingDate ? `${weddingDate}${attr.scheduled_at.slice(10)}` : attr.scheduled_at;
    return {
      sourceType: 'wedding_schedule' as const,
      sourceId: row.id,
      chapter: 'wedding' as const,
      title: row.title,
      badge: attr.event_type === '청첩장모임' ? '청모' : attr.event_type,
      startAt: scheduledAt,
      hasTime: true,
      location: attr.location ?? '',
      linkTo: `/wedding/schedule?event=${row.id}`,
    };
  });
}

async function fetchConsultNoteEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('consult_note')
    .select('id, vendor_name, vendor_type, visit_date, status, address')
    .eq('workspace_id', workspaceId)
    .not('visit_date', 'is', null);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    sourceType: 'consult_note' as const,
    sourceId: row.id,
    chapter: 'wedding' as const,
    title: `${row.vendor_name} 상담`,
    badge: row.status === 'done' ? '상담 완료' : '상담',
    startAt: dateOnlyToStartAt(row.visit_date),
    hasTime: false,
    location: row.address ?? '',
    linkTo: `/wedding/consult-notes?note=${row.id}`,
  }));
}

async function fetchHoneymoonEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('honeymoon')
    .select('id, destination, start_date, end_date')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.start_date) return [];
  return [
    {
      sourceType: 'honeymoon' as const,
      sourceId: data.id,
      chapter: 'wedding' as const,
      title: `신혼여행 출발${data.destination ? ` · ${data.destination}` : ''}`,
      badge: '신혼여행',
      startAt: dateOnlyToStartAt(data.start_date),
      hasTime: false,
      location: data.destination ?? '',
      linkTo: '/wedding/honeymoon',
    },
  ];
}

async function fetchPregnancyEventEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('pregnancy_event')
    .select('id, title, event_type, scheduled_at, location')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    sourceType: 'pregnancy_event' as const,
    sourceId: row.id,
    chapter: 'pregnancy' as const,
    title: row.title,
    badge: row.event_type,
    startAt: row.scheduled_at,
    hasTime: true,
    location: row.location ?? '',
    linkTo: `/pregnancy/schedule?event=${row.id}`,
  }));
}

async function fetchCheckupEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('checkup')
    .select('id, title, hospital, scheduled_at, week_no')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    sourceType: 'pregnancy_checkup' as const,
    sourceId: row.id,
    chapter: 'pregnancy' as const,
    title: row.week_no ? `${row.title} (${row.week_no}주)` : row.title,
    badge: '검진',
    startAt: row.scheduled_at,
    hasTime: true,
    location: row.hospital ?? '',
    linkTo: '/pregnancy/checkup',
  }));
}

export async function fetchCalendarEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspace')
    .select('wedding_date')
    .eq('id', workspaceId)
    .maybeSingle();
  if (workspaceError) throw workspaceError;

  const groups = await Promise.all([
    fetchLovePlanEvents(workspaceId),
    fetchWeddingScheduleEvents(workspaceId, workspace?.wedding_date ?? null),
    fetchConsultNoteEvents(workspaceId),
    fetchHoneymoonEvents(workspaceId),
    fetchPregnancyEventEvents(workspaceId),
    fetchCheckupEvents(workspaceId),
  ]);
  return groups.flat();
}
