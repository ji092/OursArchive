-- 일정 댓글 + 확인 리마인더 (docs/DECISIONS.md 참조 예정 — 2026-07-31 사용자 요청).
-- 대상: love_plan(연애) / schedule_attr(결혼, PK=prep_item_id) / checkup·pregnancy_event(임신).
-- wedding_day_schedule은 프론트 어디서도 안 쓰이는 죽은 테이블(당일 일정 기능 자체가 스킵됨)이라 제외.
--
-- 기존 comment 테이블(기록용: love_record/pregnancy_diary/baby_record)과 완전히 분리한다 —
-- 사용자가 명시적으로 "등록된 게시물 댓글과 분리 관리" 요청. schedule_comment/schedule_ack는
-- 소스가 4개 테이블로 갈라져 조인 경로가 다 달라서, comment와 달리 workspace_id를 직접 저장해
-- RLS를 단순하게 유지한다(can_access_couple_content(workspace_id) 한 줄).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'schedule_source_type') then
    create type schedule_source_type as enum ('love_plan', 'wedding_schedule', 'pregnancy_checkup', 'pregnancy_event');
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'schedule_reminder' and enumtypid = 'notification_type'::regtype) then
    alter type notification_type add value 'schedule_reminder';
  end if;
end;
$$;

create table if not exists schedule_ack (
  id uuid primary key default gen_random_uuid(),
  source_type schedule_source_type not null,
  source_id uuid not null,
  workspace_id uuid not null references workspace (id) on delete cascade,
  created_by uuid not null references profiles (id),
  ack_role membership_role not null, -- 등록 시 선택한 "확인해야 하는 역할"
  acknowledged_at timestamptz, -- ack_role 멤버가 댓글 달면 세팅 — 이후 리마인더 전부 중단
  reminder_tier smallint not null default 0, -- 0=미발송, 1/2/3, 4=48h부터 24h마다 반복
  last_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists schedule_ack_workspace_idx on schedule_ack (workspace_id);
create index if not exists schedule_ack_due_idx on schedule_ack (reminder_tier, last_reminder_at) where acknowledged_at is null;

create table if not exists schedule_comment (
  id uuid primary key default gen_random_uuid(),
  source_type schedule_source_type not null,
  source_id uuid not null,
  workspace_id uuid not null references workspace (id) on delete cascade,
  author_id uuid not null references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists schedule_comment_source_idx on schedule_comment (source_type, source_id);

create table if not exists push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscription_user_idx on push_subscription (user_id);

-- 댓글 작성 시: (1) 작성자 제외 master+partner에게 알림, (2) 작성자 role이 ack_role과 같으면
-- acknowledged_at을 세팅해 리마인더를 멈춘다.
create or replace function trg_notify_schedule_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  commenter_role membership_role;
begin
  insert into notification (workspace_id, recipient_user_id, type, title, meta, source_table, source_id)
  select new.workspace_id, m.user_id, 'new_comment', '일정에 새 댓글이 달렸어요', null, 'schedule_comment', new.id
  from membership m
  where m.workspace_id = new.workspace_id and m.status = 'active' and m.role = any(array['master', 'partner']::membership_role[])
    and m.user_id <> new.author_id;

  select m.role into commenter_role
  from membership m
  where m.workspace_id = new.workspace_id and m.user_id = new.author_id and m.status = 'active';

  if commenter_role is not null then
    update schedule_ack
    set acknowledged_at = now()
    where source_type = new.source_type and source_id = new.source_id
      and acknowledged_at is null and ack_role = commenter_role;
  end if;

  return new;
end;
$$;

drop trigger if exists schedule_comment_notify on schedule_comment;
create trigger schedule_comment_notify after insert on schedule_comment
  for each row execute function trg_notify_schedule_comment();

-- 15분 간격 pg_cron이 호출: 확인 안 된 일정 중 다음 티어에 도달한 것만 원자적으로 골라
-- tier를 올리고, 수신자(ack_role 멤버, 등록자 본인 제외)에게 notification을 만든 뒤
-- Edge Function이 실제 push를 보낼 수 있게 (recipient, title, source_type, source_id)를 리턴한다.
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
  recipients as (
    select titled.reminder_title, titled.source_type, titled.source_id, titled.workspace_id, m.user_id
    from titled
    join membership m on m.workspace_id = titled.workspace_id and m.role = titled.ack_role
      and m.status = 'active' and m.user_id <> titled.created_by
  ),
  inserted as (
    insert into notification (workspace_id, recipient_user_id, type, title, meta, source_table, source_id)
    select workspace_id, user_id, 'schedule_reminder', reminder_title, null, source_type::text, source_id
    from recipients
    returning recipient_user_id, title, source_id
  )
  select inserted.recipient_user_id, inserted.title, recipients.source_type, inserted.source_id
  from inserted
  join recipients on recipients.user_id = inserted.recipient_user_id and recipients.source_id = inserted.source_id;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 아래는 Supabase 대시보드에서 1회만 수동 실행 (pg_cron/pg_net extension 활성화 필요,
-- Database → Extensions에서 켠 뒤 SQL Editor에서 아래를 실행). <PROJECT_REF>와
-- <SERVICE_ROLE_OR_SECRET>은 실제 값으로 바꿔서 실행할 것 — 이 값들은 여기 커밋하지 않는다.
--
-- select cron.schedule(
--   'schedule-reminder-tick',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/schedule-reminder-tick',
--     headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_OR_SECRET>', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
