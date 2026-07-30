-- PHASE 7 후속: 실시간(폴링) 알림 — GlobalHeader.tsx의 MOCK_NOTIFICATIONS 하드코딩을 대체한다.
-- 요구사항(2026-07-29 사용자 지정): master=새 게시글+댓글+모든 일정, partner=새 게시글+모든 일정,
-- family=본인 권한 변경 알림만. 생성은 전부 서버측 트리거(security definer)에서만 한다 —
-- 클라이언트가 notification에 직접 insert할 이유가 없고, 그래야 role별 분기가 서버 한 곳에만 존재한다.

-- 아래 블록들은 몇 번을 다시 실행해도 안전하다(이미 있으면 건너뜀) — SQL Editor에서 중간에
-- 실패해도 처음부터 그냥 다시 실행하면 된다.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum ('new_post', 'new_comment', 'schedule', 'role_changed');
  end if;
end;
$$;

create table if not exists notification (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  recipient_user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  meta text,
  source_table text not null,
  source_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notification_recipient_created_idx on notification (recipient_user_id, created_at desc);
create index if not exists notification_workspace_idx on notification (workspace_id);

-- 대상 role 목록에 속한 활성 멤버 전원에게 알림 행을 하나씩 만든다. 개별 트리거 함수가 재사용한다.
create or replace function notify_roles(
  ws uuid,
  roles membership_role[],
  p_type notification_type,
  p_title text,
  p_meta text,
  p_source_table text,
  p_source_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notification (workspace_id, recipient_user_id, type, title, meta, source_table, source_id)
  select ws, m.user_id, p_type, p_title, p_meta, p_source_table, p_source_id
  from membership m
  where m.workspace_id = ws and m.status = 'active' and m.role = any(roles);
end;
$$;

-- 새 게시글: love_record/pregnancy_diary/baby_record 공통 (workspace_id 컬럼을 직접 갖는 테이블들).
create or replace function trg_notify_new_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform notify_roles(new.workspace_id, array['master', 'partner']::membership_role[], 'new_post',
    '새 게시글이 올라왔어요', null, TG_TABLE_NAME, new.id);
  return new;
end;
$$;

drop trigger if exists love_record_notify on love_record;
create trigger love_record_notify after insert on love_record
  for each row execute function trg_notify_new_post();
drop trigger if exists pregnancy_diary_notify on pregnancy_diary;
create trigger pregnancy_diary_notify after insert on pregnancy_diary
  for each row execute function trg_notify_new_post();
drop trigger if exists baby_record_notify on baby_record;
create trigger baby_record_notify after insert on baby_record
  for each row execute function trg_notify_new_post();

-- 새 댓글: master만 받는다 (요구사항 그대로 — partner/family는 댓글 알림 대상 아님).
-- comment는 다형성 테이블이라 target_type별로 부모의 workspace_id를 조회해야 한다.
create or replace function trg_notify_new_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ws uuid;
begin
  if new.target_type = 'love_record' then
    select workspace_id into ws from love_record where id = new.target_id;
  elsif new.target_type = 'pregnancy_diary' then
    select workspace_id into ws from pregnancy_diary where id = new.target_id;
  elsif new.target_type = 'baby_record' then
    select workspace_id into ws from baby_record where id = new.target_id;
  end if;

  if ws is not null then
    perform notify_roles(ws, array['master']::membership_role[], 'new_comment',
      '새 댓글이 달렸어요', null, 'comment', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists comment_notify on comment;
create trigger comment_notify after insert on comment
  for each row execute function trg_notify_new_comment();

-- 일정: love_plan/checkup/pregnancy_event/wedding_day_schedule는 workspace_id를 직접 가진다.
create or replace function trg_notify_schedule()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform notify_roles(new.workspace_id, array['master', 'partner']::membership_role[], 'schedule',
    '새 일정이 등록됐어요', null, TG_TABLE_NAME, new.id);
  return new;
end;
$$;

drop trigger if exists love_plan_notify on love_plan;
create trigger love_plan_notify after insert on love_plan
  for each row execute function trg_notify_schedule();
drop trigger if exists checkup_notify on checkup;
create trigger checkup_notify after insert on checkup
  for each row execute function trg_notify_schedule();
drop trigger if exists pregnancy_event_notify on pregnancy_event;
create trigger pregnancy_event_notify after insert on pregnancy_event
  for each row execute function trg_notify_schedule();
drop trigger if exists wedding_day_schedule_notify on wedding_day_schedule;
create trigger wedding_day_schedule_notify after insert on wedding_day_schedule
  for each row execute function trg_notify_schedule();

-- schedule_attr(결혼 준비 항목의 일정 속성)은 자체 workspace_id가 없고 prep_item을 통해서만 알 수 있다.
create or replace function trg_notify_schedule_attr()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ws uuid;
begin
  select workspace_id into ws from prep_item where id = new.prep_item_id;
  if ws is not null then
    perform notify_roles(ws, array['master', 'partner']::membership_role[], 'schedule',
      '새 일정이 등록됐어요', null, 'schedule_attr', new.prep_item_id);
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_attr_notify on schedule_attr;
create trigger schedule_attr_notify after insert on schedule_attr
  for each row execute function trg_notify_schedule_attr();

-- 권한 변경: family를 포함해 모든 role에게 "내 role이 바뀌었다"는 알림만 본인에게 보낸다.
create or replace function trg_notify_role_changed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into notification (workspace_id, recipient_user_id, type, title, meta, source_table, source_id)
    values (new.workspace_id, new.user_id, 'role_changed', '내 권한이 변경됐어요', null, 'membership', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists membership_role_notify on membership;
create trigger membership_role_notify after update on membership
  for each row execute function trg_notify_role_changed();
