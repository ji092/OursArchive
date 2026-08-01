-- 일정 전날 오후 2시(KST) 리마인더 (2026-08-01 사용자 요청).
--
-- 0016의 리마인더와는 성격이 다르다:
--   0016 run_schedule_reminders()      = "확인(댓글) 안 하면" 6h→12h→24h→24h마다 조르는 알림. ack 기반.
--   0017 run_schedule_day_before()     = 일정 날짜 하루 전 14:00에 딱 1회. 날짜 기반, ack와 무관.
-- 그래서 schedule_ack의 tier를 쓰지 않고 별도 발송 기록 테이블로 중복만 막는다.
--
-- 대상은 0016과 동일한 4개 소스(love_plan / schedule_attr / checkup / pregnancy_event).
-- 수신자는 0016과 달리 **등록자를 제외하지 않는다** — "확인해라"가 아니라 "내일 이거 있다"는
-- 공지라서 등록한 본인에게도 떠야 한다. 워크스페이스의 active master+partner 전원.

-- 발송 기록. schedule_ack와 마찬가지로 폴리모픽이라 FK 캐스케이드를 걸 수 없다 —
-- 다만 이 테이블은 "이미 보냈다"는 사실만 담고 미래 발송을 유발하지 않으므로,
-- 일정이 지워져 고아 행이 남아도 알림이 잘못 나가지는 않는다(0016 ack와의 차이).
create table if not exists schedule_day_notice (
  source_type schedule_source_type not null,
  source_id uuid not null,
  sent_for date not null, -- 알림을 보낸 대상 일정의 KST 날짜. 일정을 다른 날로 옮기면 새로 한 번 더 간다.
  sent_at timestamptz not null default now(),
  primary key (source_type, source_id, sent_for)
);

-- PostgREST로는 아무도 못 읽게 한다. 정책을 하나도 만들지 않으면 RLS가 전부 거부하고,
-- 아래 함수는 security definer라 그대로 통과한다. 클라이언트가 쓸 일이 없는 내부 장부 테이블.
alter table schedule_day_notice enable row level security;

-- pg_cron이 15분마다 호출(0016과 같은 tick). KST 기준 오늘이 D-1이고 현재 시각이 14:00을
-- 넘겼으면, 아직 안 보낸 일정에 대해 발송 기록을 남기고 수신자 목록을 리턴한다.
-- insert ... on conflict do nothing 의 returning을 쓰기 때문에 tick이 겹쳐 돌아도 1회만 나간다.
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
           lp.workspace_id as ws_id, lp.title as src_title, lp.planned_at as at_utc
    from love_plan lp
    union all
    select 'wedding_schedule'::schedule_source_type, sa.prep_item_id,
           pi.workspace_id, pi.title, sa.scheduled_at
    from schedule_attr sa
    join prep_item pi on pi.id = sa.prep_item_id
    union all
    select 'pregnancy_checkup'::schedule_source_type, c.id,
           c.workspace_id, c.title, c.scheduled_at
    from checkup c
    where c.status = 'upcoming' -- 이미 다녀온 검진은 제외
    union all
    select 'pregnancy_event'::schedule_source_type, pe.id,
           pe.workspace_id, pe.title, pe.scheduled_at
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
    -- ON CONFLICT은 컬럼명 대신 **제약 이름**으로 추론한다. 컬럼명을 쓰면
    -- `on conflict (source_type, source_id, sent_for)` 의 인덱스 추론 절이 표현식으로 파싱돼
    -- RETURNS TABLE의 출력 파라미터(source_type/source_id)와 충돌하고,
    -- "column reference source_type is ambiguous" 로 함수가 통째로 죽는다.
    -- (INSERT의 대상 컬럼 목록은 표현식이 아니라 무해하다 — 위 줄은 그대로 둬도 된다.)
    -- 2026-08-01 14:00~15:00 프로덕션에서 5회 연속 500으로 실패한 뒤 발견.
    on conflict on constraint schedule_day_notice_pkey do nothing
    returning schedule_day_notice.source_type as c_type, schedule_day_notice.source_id as c_id
  ),
  -- CTE 컬럼명은 전부 별칭을 준다 — RETURNS TABLE의 출력 파라미터(title/source_type/source_id 등)와
  -- 이름이 겹치면 plpgsql이 "column reference is ambiguous"로 실패한다(0016에서 실제로 겪음).
  payload as (
    select t.src_type, t.src_id, t.ws_id,
           '내일 일정 · ' || t.src_title as n_title,
           to_char(t.at_kst, 'HH24:MI') || ' 예정' as n_body
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

-- 리마인더 RPC는 Edge Function(service_role)만 호출해야 한다.
-- 함수는 기본값이 `execute to public`이라, 이걸 빼면 프론트에 노출된 anon 키만으로
-- /rest/v1/rpc/run_schedule_day_before 를 때려 전 워크스페이스 알림을 강제 발송시킬 수 있다.
-- (0016 적용 시 빠져 있던 것을 2026-08-01 권한 점검에서 발견해 두 함수 모두 함께 막음.)
revoke execute on function run_schedule_reminders() from public, anon, authenticated;
revoke execute on function run_schedule_day_before() from public, anon, authenticated;
grant execute on function run_schedule_reminders() to service_role;
grant execute on function run_schedule_day_before() to service_role;

-- cron은 0016에서 등록한 'schedule-reminder-tick' 하나를 그대로 쓴다 (15분 간격).
-- Edge Function이 run_schedule_reminders()와 run_schedule_day_before()를 둘 다 호출하므로
-- 새 cron job을 추가할 필요는 없다 — Edge Function만 재배포하면 된다.
