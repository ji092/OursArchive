-- PHASE 7: 연애(Love) 도메인 — 요구사항 5.2를 구현.
-- 기록(과거)=love_record/love_photo, 계획(미래)=love_plan, 댓글=comment(다형성, 향후 pregnancy_diary/baby_record도 참조).
--
-- comment.target_type은 지금은 'love_record'만 실제로 쓰인다. pregnancy_diary/baby_record는
-- 아직 테이블이 없으므로 enum 값만 미리 선언해두고, 해당 도메인 마이그레이션에서 실제로 연결한다.

create type content_visibility as enum ('couple', 'family', 'guest');
create type comment_target_type as enum ('love_record', 'pregnancy_diary', 'baby_record');

create table love_record (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  author_id uuid not null references profiles (id),
  body text not null,
  place_name text not null, -- 요구사항 3.2.6: 장소 필수 (지도 뷰 일관성 보장)
  place_lat numeric,
  place_lng numeric,
  recorded_at timestamptz not null, -- 요구사항 3.2.6: 날짜 필수 (달력 뷰 일관성 보장)
  visibility content_visibility not null default 'couple',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table love_photo (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references love_record (id) on delete cascade,
  url text not null, -- R2 오브젝트 키/URL (기술스택 결정 2026-07-21) — 참고: PHASE7 photos 통합 테이블 설계 시 재검토
  sort_order int not null default 0
);

create table comment (
  id uuid primary key default gen_random_uuid(),
  target_type comment_target_type not null,
  target_id uuid not null, -- 다형성 참조, FK 제약 없음(테이블이 여러 개이므로)
  author_id uuid not null references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table love_plan (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  title text not null,
  planned_at timestamptz not null,
  place_name text,
  converted_record_id uuid references love_record (id), -- 계획 → 기록 전환 시 연결
  visibility content_visibility not null default 'couple', -- 확장용 컬럼, 현재 로직은 love 카테고리 규칙(파트너 전용) 고정
  created_at timestamptz not null default now()
);

create index on love_record (workspace_id);
create index on love_record (recorded_at);
create index on love_photo (record_id);
create index on comment (target_type, target_id);
create index on love_plan (workspace_id);
create index on love_plan (planned_at);
