-- PHASE 7: 임신·출산·육아 도메인 — 요구사항 5.4 구현.
-- 사진 테이블은 통합 photos 테이블(PHASE6 10장에서 예고)로 만들지 않고, 0002_love.sql의 love_photo와
-- 같은 도메인별 패턴을 유지한다 (일관성 우선, 통합은 필요해지면 별도 마이그레이션으로 전환).
-- 목업 확인(2026-07-22)으로 checkup에 "성별 확인 가능" 같은 방문 전 안내 문구가 있는 걸 확인 —
-- 방문 후 소견인 result_memo와 성격이 달라(방문 전에도 표시됨) note 컬럼을 별도로 둔다.

create table pregnancy_diary (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  week_no int not null,
  title text not null,
  body text,
  is_ultrasound boolean not null default false,
  recorded_at date not null,
  visibility content_visibility not null default 'family',
  created_at timestamptz not null default now()
);

create table diary_photo (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references pregnancy_diary (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

create type checkup_status as enum ('done', 'upcoming');

create table checkup (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  week_no int,
  title text not null,
  hospital text not null,
  doctor text,
  scheduled_at timestamptz not null,
  status checkup_status not null default 'upcoming',
  note text, -- 방문 전 안내(예: "성별 확인 가능") — 목업 NEXT CHECKUP 카드에서 확인
  result_memo text,
  result_weight numeric,
  result_extra jsonb,
  created_at timestamptz not null default now()
);

create table health_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  logged_at date not null,
  weight numeric,
  blood_pressure text,
  symptom text,
  fetal_movement_count int
);

create table prenatal_letter (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  body text not null,
  written_at date not null
);

-- 주차별 자동 콘텐츠 마스터 데이터. 워크스페이스에 속하지 않는 전역 참조 테이블 — 시드 데이터로 채운다.
create table week_content (
  week_no int primary key,
  size_metaphor text not null,
  weight_g int,
  length_cm numeric,
  development text,
  mother_tip text
);

create type baby_record_type as enum ('growth', 'feeding', 'sleep', 'vaccine', 'diary');

create table baby_record (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  month_no int,
  type baby_record_type not null,
  title text not null,
  body text,
  measured_height numeric,
  measured_weight numeric,
  recorded_at date not null,
  visibility content_visibility not null default 'family',
  created_at timestamptz not null default now()
);

create table baby_photo (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references baby_record (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

-- 일정(Schedule) 탭 — 검진(checkup)과 별개의 일반 일정. 결혼(하나가) 챕터의 schedule_attr과
-- 동일한 개념(2026-07-27, 일정 탭을 하나가 챕터와 동일 구조로 만들며 추가).
create type pregnancy_event_type as enum ('태교', '모임', '쇼핑', '기타');

create table pregnancy_event (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  title text not null,
  event_type pregnancy_event_type not null,
  scheduled_at timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

-- 지불(가계부) — 임신·출산·육아 지출. checkup/health_log와 동일하게 Master·파트너 전용
-- (visibility 컬럼 없음, can_access_couple_content로만 판정 — 2026-07-27 사용자 지정).
create type pregnancy_expense_category as enum (
  '병원·검진', '보험', '산후조리원', '출산준비물', '기저귀·물티슈',
  '분유·이유식', '아기옷·용품', '예방접종·약', '산모용품', '기타'
);

create table pregnancy_expense (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  category pregnancy_expense_category not null,
  amount bigint not null,
  expense_date date not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);

create index on pregnancy_diary (workspace_id);
create index on pregnancy_diary (recorded_at);
create index on diary_photo (diary_id);
create index on checkup (workspace_id);
create index on checkup (scheduled_at);
create index on health_log (workspace_id);
create index on prenatal_letter (workspace_id);
create index on baby_record (workspace_id);
create index on baby_record (recorded_at);
create index on baby_photo (record_id);
create index on pregnancy_event (workspace_id);
create index on pregnancy_event (scheduled_at);
create index on pregnancy_expense (workspace_id);
create index on pregnancy_expense (expense_date);
