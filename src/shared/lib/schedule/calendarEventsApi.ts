import { supabase } from '@/shared/lib/api/supabaseClient';
import { dateOnlyToStartAt, type CalendarEvent } from './calendarEvents';

// 일곱 곳에 흩어진 일정을 한 번에 읽어 CalendarEvent로 정규화한다.
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

// 체크리스트 항목의 마감 기한도 달력에 서는 일정이다(2026-09-02 사용자 지정) — 일정 탭 항목처럼
// 시각이 있는 약속이 아니라 "그 날까지"라, 제목을 `"항목" 기한`으로 붙이고 달력에서는 다른 표시를
// 쓴다(isDeadlineEvent). 일정 속성까지 있는 항목은 일정과 기한 두 줄로 서지만 원본은 같은 prep_item
// 한 건이다(sourceType이 달라 키가 겹치지 않는다).
async function fetchChecklistDueEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('prep_item')
    .select('id, title, checklist_attr!inner(due_date, done)')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const attr = (Array.isArray(row.checklist_attr) ? row.checklist_attr[0] : row.checklist_attr) as {
        due_date: string | null;
        done: boolean;
      };
      return { row, attr };
    })
    .filter(({ attr }) => !!attr?.due_date)
    .map(({ row, attr }) => ({
      sourceType: 'checklist_due' as const,
      sourceId: row.id,
      chapter: 'wedding' as const,
      title: `"${row.title}" 기한`,
      badge: attr.done ? '기한 완료' : '기한',
      startAt: dateOnlyToStartAt(attr.due_date!),
      hasTime: false,
      location: '',
      linkTo: '/wedding/checklist',
    }));
}

async function fetchConsultNoteEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('consult_note')
    .select('id, vendor_name, vendor_type, visit_date, visit_time, status, address')
    .eq('workspace_id', workspaceId)
    .not('visit_date', 'is', null);
  if (error) throw error;
  return (data ?? []).map((row) => {
    // 시각을 입력한 노트는 그 시각의 일정으로, 안 넣은 노트는 하루 종일 일정으로 다룬다.
    const time = row.visit_time ? String(row.visit_time).slice(0, 5) : null;
    return {
      sourceType: 'consult_note' as const,
      sourceId: row.id,
      chapter: 'wedding' as const,
      title: `${row.vendor_name} 상담`,
      badge: row.status === 'done' ? '상담 완료' : '상담',
      startAt: time
        ? new Date(`${String(row.visit_date).slice(0, 10)}T${time}:00`).toISOString()
        : dateOnlyToStartAt(row.visit_date),
      hasTime: !!time,
      location: row.address ?? '',
      linkTo: `/wedding/consult-notes?note=${row.id}`,
    };
  });
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
    fetchChecklistDueEvents(workspaceId),
    fetchConsultNoteEvents(workspaceId),
    fetchHoneymoonEvents(workspaceId),
    fetchPregnancyEventEvents(workspaceId),
    fetchCheckupEvents(workspaceId),
  ]);
  return groups.flat();
}
