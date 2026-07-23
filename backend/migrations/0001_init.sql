-- PHASE 7 착수: 계정 · 워크스페이스 · 권한(RBAC) 기반
-- 요구사항 5.1을 Supabase에 맞게 조정한 것 (DECISIONS.md 2026-07-21 "DB 스키마 설계 책임 확정" 항목 참조).
--
-- 조정 사항 (Supabase Auth 위임):
--   - 커스텀 `user`/`password_hash` 테이블을 만들지 않는다. 비밀번호 해시(Argon2id 수준)는
--     Supabase Auth(GoTrue)가 auth.users에서 이미 안전하게 처리한다 (요구사항 7.6 충족).
--   - `password_reset_token`도 별도로 만들지 않는다. Supabase Auth의 내장 비밀번호 재설정
--     플로우(resetPasswordForEmail)가 이미 30분 만료·1회용·해시 기반 토큰을 제공한다.
--   - 대신 `profiles` 테이블로 auth.users를 1:1 확장한다 (name, avatar_url 등 우리 도메인 필드).
--   - `invite_token`은 커스텀으로 유지한다 — Supabase의 기본 초대(admin.inviteUserByEmail)는
--     초대 즉시 auth.users를 만들어버려 "본인이 승낙 시점에 직접 비밀번호를 설정"하는 요구사항
--     7.4와 맞지 않는다. 실제 계정 생성은 초대 수락 Edge Function에서 우리 토큰 검증 후
--     supabase.auth.admin.createUser를 호출하는 시점에만 일어난다.

create extension if not exists pgcrypto;

create table workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  couple_start_date date,
  wedding_date date,
  due_date date,
  created_at timestamptz not null default now()
);

-- auth.users(id)의 1:1 확장. auth.users 자체는 건드리지 않는다.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create type membership_role as enum ('master', 'partner', 'family', 'guest');
create type membership_status as enum ('active', 'invited', 'pending');

create table membership (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role membership_role not null,
  status membership_status not null default 'pending',
  relation_label text,
  invited_by uuid references profiles (id),
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create type invite_status as enum ('active', 'used', 'expired', 'revoked');

create table invite_token (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  email text not null,
  role membership_role not null,
  token_hash text not null, -- SHA-256 해시만 저장, 원문 저장 금지 (요구사항 7.4/7.5)
  expires_at timestamptz not null,
  used_at timestamptz,
  status invite_status not null default 'active',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  actor_id uuid references profiles (id),
  action text not null,
  target text,
  ip inet,
  created_at timestamptz not null default now()
);

create index on membership (workspace_id);
create index on membership (user_id);
create index on invite_token (workspace_id);
create index on audit_log (workspace_id);

-- auth.users에 새 계정이 생기면 profiles 행을 자동으로 만든다.
-- (초대 수락 Edge Function이 매번 profiles insert를 직접 챙기지 않아도 되게 — 중복 로직 방지)
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
