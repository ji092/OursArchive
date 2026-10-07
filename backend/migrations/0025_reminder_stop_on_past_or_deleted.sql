-- 확인 독촉(run_schedule_reminders)이 지난 일정·삭제된 일정에도 계속 나가던 문제 수정 (2026-10-07).
--
-- 0016의 run_schedule_reminders()는 schedule_ack만 보고 돌아서, 멈추는 조건이 "ack_role 멤버가
-- 댓글을 단다" 하나뿐이었다. 그래서
--   1. 일정 시각이 지나도 tier 4(24시간마다 반복)로 계속 울렸고,
--   2. 원본 일정이 지워졌는데 schedule_ack 정리가 빠진 경우(폴리모픽 참조라 FK 캐스케이드가 없다 —
--      예: 체크리스트 화면에서 일정 붙은 준비 항목 삭제) 고아 행이 계속 울렸고,
--   3. 상담 완료·검진 완료처럼 끝난 일정도 계속 울렸다.
--
-- 고치는 방식: 발송 직전에 원본이 "아직 살아 있는 일정"인지 서버에서 확인한다. 프론트의
-- deleteScheduleAck()는 그대로 두지만, 그게 빠지거나 실패해도 여기서 막힌다.
--
-- 행을 지우거나 acknowledged_at을 채우지 않고 **조건으로 거르기만** 한다:
--   - acknowledged_at은 "상대가 확인했다"는 뜻이라, 지난 일정에 채우면 사실과 달라진다.
--   - 지난 일정을 다시 미래로 옮기면 독촉이 그대로 이어져야 한다(행이 남아 있어야 가능).
--   - 걸러진 행은 티어도 last_reminder_at도 바뀌지 않으므로 부작용이 없다.
--
-- "지난 일정" 기준 (2026-10-07 사용자 확인):
--   - 시각이 있는 일정: 그 시각이 지나면 중단.
--   - 시각이 없는 일정(체크리스트 기한, 시각 미입력 상담): 그 날짜 다음날 00:00 KST부터 중단.
--   - 날짜 자체가 없는 상담노트·체크리스트 항목: 일정이 아니므로 독촉하지 않는다(2026-10-07 사용자 결정 —
--     "날짜가 있는 것만 반응"). 나중에 날짜를 넣으면 그때부터 독촉이 이어진다.

create or replace function schedule_source_is_live(p_type schedule_source_type, p_id uuid, p_now timestamptz default now())
returns boolean
language sql
stable
set search_path = public
as $$
  select case p_type
    when 'love_plan' then exists (
      select 1 from love_plan lp where lp.id = p_id and lp.planned_at > p_now)
    when 'wedding_schedule' then exists (
      select 1 from schedule_attr sa where sa.prep_item_id = p_id and sa.scheduled_at > p_now)
    when 'pregnancy_checkup' then exists (
      select 1 from checkup c where c.id = p_id and c.status = 'upcoming' and c.scheduled_at > p_now)
    when 'pregnancy_event' then exists (
      select 1 from pregnancy_event pe where pe.id = p_id and pe.scheduled_at > p_now)
    when 'consult_note' then exists (
      select 1 from consult_note cn
      where cn.id = p_id and cn.status <> 'done'
        and cn.visit_date is not null
        and (case when cn.visit_time is null then (cn.visit_date + 1) + time '00:00'
                  else cn.visit_date + cn.visit_time end) at time zone 'Asia/Seoul' > p_now)
    when 'checklist_due' then exists (
      select 1 from checklist_attr ca
      where ca.prep_item_id = p_id and ca.done = false
        and ca.due_date is not null
        and ((ca.due_date + 1) + time '00:00') at time zone 'Asia/Seoul' > p_now)
    -- 모르는 소스가 enum에 추가되면 조용히 계속 울리는 것보다 안 울리는 쪽이 낫다.
    else false
  end;
$$;

revoke execute on function schedule_source_is_live(schedule_source_type, uuid, timestamptz) from public, anon, authenticated;
grant execute on function schedule_source_is_live(schedule_source_type, uuid, timestamptz) to service_role;

-- 0016과 같은 본문에 schedule_source_is_live() 조건 한 줄만 추가했다.
create or replace function run_schedule_reminders()
returns table (recipient_user_id uuid, title text, source_type schedule_source_type, source_id uuid)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with due as (
    update schedule_ack sa
    set
      reminder_tier = case
        when sa.reminder_tier = 0 and now() - sa.created_at >= interval '6 hours' then 1
        when sa.reminder_tier = 1 and now() - sa.created_at >= interval '12 hours' then 2
        when sa.reminder_tier = 2 and now() - sa.created_at >= interval '24 hours' then 3
        when sa.reminder_tier >= 3 and now() - coalesce(sa.last_reminder_at, sa.created_at) >= interval '24 hours' then 4
        else sa.reminder_tier
      end,
      last_reminder_at = now()
    where sa.acknowledged_at is null
      and (
        (sa.reminder_tier = 0 and now() - sa.created_at >= interval '6 hours')
        or (sa.reminder_tier = 1 and now() - sa.created_at >= interval '12 hours')
        or (sa.reminder_tier = 2 and now() - sa.created_at >= interval '24 hours')
        or (sa.reminder_tier >= 3 and now() - coalesce(sa.last_reminder_at, sa.created_at) >= interval '24 hours')
      )
      -- 2026-10-07: 지난 일정·삭제된 일정·완료된 일정은 건너뛴다 (파일 상단 주석 참조).
      and schedule_source_is_live(sa.source_type, sa.source_id)
    returning sa.id, sa.source_type, sa.source_id, sa.workspace_id, sa.created_by, sa.ack_role, sa.reminder_tier
  ),
  titled as (
    select
      due.*,
      case due.reminder_tier
        when 1 then '새로운 일정 등록, 확인바람'
        when 2 then '새로운 일정 등록 12시간 경과'
        when 3 then '자기야 일정 확인해봐~'
        else '자기야 일정 확인좀 할까????'
      end as reminder_title
    from due
  ),
  -- CTE 컬럼은 전부 src_*/ws_*/n_* 로 별칭을 준다 — RETURNS TABLE의 출력 파라미터와 이름이
  -- 겹치면 plpgsql이 "column reference is ambiguous"로 실패한다(0016 주석 참조).
  recipients as (
    select titled.reminder_title as n_title, titled.source_type as src_type,
           titled.source_id as src_id, titled.workspace_id as ws_id, m.user_id as uid
    from titled
    join membership m on m.workspace_id = titled.workspace_id and m.role = titled.ack_role
      and m.status = 'active' and m.user_id <> titled.created_by
  ),
  inserted as (
    insert into notification (workspace_id, recipient_user_id, type, title, meta, source_table, source_id)
    select r.ws_id, r.uid, 'schedule_reminder', r.n_title, null, r.src_type::text, r.src_id
    from recipients r
    returning notification.recipient_user_id as n_uid, notification.title as n_ttl, notification.source_id as n_sid
  )
  select i.n_uid, i.n_ttl, r2.src_type, i.n_sid
  from inserted i
  join recipients r2 on r2.uid = i.n_uid and r2.src_id = i.n_sid;
end;
$$;

revoke execute on function run_schedule_reminders() from public, anon, authenticated;
grant execute on function run_schedule_reminders() to service_role;
