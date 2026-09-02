-- 0023에서 추가한 소스(consult_note, checklist_due)를 전날 공지 함수에 반영한다.
-- 0023을 먼저 실행한 뒤 이 파일을 실행할 것 (같은 트랜잭션이면 enum 오류가 난다).
--
-- run_schedule_reminders()(확인 독촉)는 schedule_ack 행만 보고 도는 소스 무관 함수라 고칠 것이
-- 없다 — 프론트가 상담노트·체크리스트에 대해 schedule_ack를 만들기 시작하면 그대로 동작한다.
--
-- 0017과 달라진 점:
--   1. 소스가 4개 → 6개.
--   2. 시각이 없는 일정(상담노트 시각 미입력, 체크리스트 기한)이 생겨 본문에 "HH:MM 예정"을
--      찍으면 거짓말이 된다. has_time을 함께 들고 다니며 본문을 갈라 쓴다.
--   3. 이미 끝난 것은 제외한다 — 상담 완료(status='done')와 체크리스트 완료(done=true).

create or replace function run_schedule_day_before()
returns table (recipient_user_id uuid, title text, body text, source_type schedule_source_type, source_id uuid)
language plpgsql
security definer set search_path = public
as $$
declare
  kst_now timestamp := now() at time zone 'Asia/Seoul';
begin
  -- 14:00 이전이면 아무것도 하지 않는다. (14:00을 넘긴 뒤의 첫 tick에서 발송)
  if kst_now::time < time '14:00' then
    return;
  end if;

  return query
  with occurrence as (
    select 'love_plan'::schedule_source_type as src_type, lp.id as src_id,
           lp.workspace_id as ws_id, lp.title as src_title, lp.planned_at as at_utc, true as has_time
    from love_plan lp
    union all
    select 'wedding_schedule'::schedule_source_type, sa.prep_item_id,
           pi.workspace_id, pi.title, sa.scheduled_at, true
    from schedule_attr sa
    join prep_item pi on pi.id = sa.prep_item_id
    union all
    -- 상담노트 = 상담 일정(2026-08-31 결정). 시각을 안 넣은 노트는 하루 종일 일정으로 다룬다.
    select 'consult_note'::schedule_source_type, cn.id,
           cn.workspace_id, cn.vendor_name || ' 상담',
           ((cn.visit_date + coalesce(cn.visit_time, time '00:00')) at time zone 'Asia/Seoul'),
           cn.visit_time is not null
    from consult_note cn
    where cn.visit_date is not null and cn.status <> 'done'
    union all
    -- 체크리스트 기한 = "그 날까지". 시각이 없으므로 항상 has_time = false.
    select 'checklist_due'::schedule_source_type, ca.prep_item_id,
           pi.workspace_id, pi.title,
           ((ca.due_date + time '00:00') at time zone 'Asia/Seoul'),
           false
    from checklist_attr ca
    join prep_item pi on pi.id = ca.prep_item_id
    where ca.due_date is not null and ca.done = false
    union all
    select 'pregnancy_checkup'::schedule_source_type, c.id,
           c.workspace_id, c.title, c.scheduled_at, true
    from checkup c
    where c.status = 'upcoming' -- 이미 다녀온 검진은 제외
    union all
    select 'pregnancy_event'::schedule_source_type, pe.id,
           pe.workspace_id, pe.title, pe.scheduled_at, true
    from pregnancy_event pe
  ),
  tomorrow as (
    select o.*, (o.at_utc at time zone 'Asia/Seoul') as at_kst
    from occurrence o
    where (o.at_utc at time zone 'Asia/Seoul')::date = kst_now::date + 1
  ),
  claimed as (
    insert into schedule_day_notice (source_type, source_id, sent_for)
    select t.src_type, t.src_id, t.at_kst::date from tomorrow t
    -- ON CONFLICT은 컬럼명 대신 제약 이름으로 추론한다 (0017 주석 참조 — 컬럼명을 쓰면
    -- RETURNS TABLE 출력 파라미터와 이름이 겹쳐 "column reference is ambiguous"로 죽는다).
    on conflict on constraint schedule_day_notice_pkey do nothing
    returning schedule_day_notice.source_type as c_type, schedule_day_notice.source_id as c_id
  ),
  payload as (
    select t.src_type, t.src_id, t.ws_id,
           case when t.src_type = 'checklist_due'
                then '내일 마감 · "' || t.src_title || '"'
                else '내일 일정 · ' || t.src_title
           end as n_title,
           case when t.src_type = 'checklist_due' then '내일까지 끝내야 해요'
                when t.has_time then to_char(t.at_kst, 'HH24:MI') || ' 예정'
                else '시간 미정'
           end as n_body
    from tomorrow t
    join claimed c on c.c_type = t.src_type and c.c_id = t.src_id
  ),
  recipients as (
    select p.n_title, p.n_body, p.src_type, p.src_id, p.ws_id, m.user_id as uid
    from payload p
    join membership m on m.workspace_id = p.ws_id
      and m.role = any(array['master', 'partner']::membership_role[])
      and m.status = 'active'
  ),
  inserted as (
    insert into notification (workspace_id, recipient_user_id, type, title, meta, source_table, source_id)
    select r.ws_id, r.uid, 'schedule_reminder', r.n_title, null, r.src_type::text, r.src_id
    from recipients r
    returning notification.recipient_user_id as n_uid, notification.source_id as n_sid
  )
  select i.n_uid, r2.n_title, r2.n_body, r2.src_type, i.n_sid
  from inserted i
  join recipients r2 on r2.uid = i.n_uid and r2.src_id = i.n_sid;
end;
$$;

-- 0017에서와 같은 권한 설정. create or replace가 권한을 되돌리지는 않지만, 이 파일만 단독으로
-- 실행하는 경우(롤백 후 재적용 등)에도 anon에 열리지 않도록 다시 명시한다.
revoke execute on function run_schedule_day_before() from public, anon, authenticated;
grant execute on function run_schedule_day_before() to service_role;
