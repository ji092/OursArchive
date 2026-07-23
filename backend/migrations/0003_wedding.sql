-- PHASE 7: 결혼(Wedding) 도메인 — 요구사항 5.3을 구현하되, Readdy 프론트 목업(2026-07-22 검토) 확인 결과
-- 반영이 필요했던 두 가지 차이를 실제 스키마에 반영한다 (DECISIONS.md 2026-07-22 항목 참조):
--   1. prep_item ↔ consult_note는 1건 참조가 아니라 다대다다 — 목업의 "항목 수정" 모달에 상담노트
--      체크박스가 여러 개 동시 선택 가능하게 되어 있었다 (예: "예물 브랜드 리서치"가 W웨딩홀+스튜디오B
--      상담노트를 동시에 연결). → prep_item_consult_note 조인 테이블로 구현.
--   2. assignee는 "지우/현우/함께" 같은 사람 이름을 enum으로 박아두지 않는다 — 이 워크스페이스 밖의
--      다른 커플에게는 다른 이름이 필요하므로, profiles(id)를 참조하는 FK로 설계하고 NULL은 "함께"를
--      의미한다. 화면 표시 시 assignee_id가 NULL이면 "함께"로 렌더링한다.

create type wedding_category as enum ('웨딩홀', '스드메', '예물예단', '청첩장', '혼수', '신혼여행', '기타');
create type prep_item_status as enum ('in_progress', 'done');
create type wedding_event_type as enum ('상담', '계약', '청첩장모임', '본식', '기타');
create type consult_note_status as enum ('done', 'scheduled');
create type guest_side as enum ('신랑측', '신부측');
create type attending_status as enum ('yes', 'no', 'unknown');
create type expense_status as enum ('planned', 'paid');
create type attachment_link_type as enum ('budget', 'consult', 'etc');

create table prep_item (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  title text not null,
  category wedding_category not null,
  assignee_id uuid references profiles (id), -- null = "함께" (목업 확인, 위 주석 참조)
  status prep_item_status not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table checklist_attr (
  prep_item_id uuid primary key references prep_item (id) on delete cascade,
  done boolean not null default false,
  due_date date
);

create table schedule_attr (
  prep_item_id uuid primary key references prep_item (id) on delete cascade,
  scheduled_at timestamptz not null,
  location text,
  event_type wedding_event_type not null
);

create table budget_attr (
  prep_item_id uuid primary key references prep_item (id) on delete cascade,
  planned_amount bigint not null default 0,
  used_amount bigint not null default 0
);

create table consult_note (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  vendor_name text not null,
  vendor_type text not null, -- 웨딩홀/스튜디오/플래너 등, 자유 텍스트(카테고리 고정 목록 아님 — 목업에서 자유 입력 확인)
  visit_date date,
  status consult_note_status not null default 'scheduled',
  key_memos jsonb not null default '[]', -- 핵심 메모 배열
  questions jsonb not null default '[]', -- 물어볼 것 배열
  created_at timestamptz not null default now()
);

-- prep_item ↔ consult_note 다대다 (목업 "항목 수정" 모달의 다중 체크박스로 확인, 위 주석 1번 참조)
create table prep_item_consult_note (
  prep_item_id uuid not null references prep_item (id) on delete cascade,
  consult_note_id uuid not null references consult_note (id) on delete cascade,
  primary key (prep_item_id, consult_note_id)
);

create table expense (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade, -- prep_item_id가 null(단독 지출)이어도 RLS로 workspace를 판정할 수 있어야 하므로 직접 보관
  prep_item_id uuid references prep_item (id) on delete set null,
  category wedding_category not null,
  amount bigint not null,
  status expense_status not null default 'planned',
  receipt_attachment_id uuid, -- attachment 테이블은 아래에서 생성되므로 FK는 별도 alter로 추가
  created_at timestamptz not null default now()
);

create table guest_entry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  name text not null,
  side guest_side not null,
  relation text,
  attending attending_status not null default 'unknown',
  gift_amount bigint not null default 0,
  created_at timestamptz not null default now()
);

create table vendor_contact (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  vendor_name text not null,
  manager_name text,
  phone text,
  contract_info text,
  consult_note_id uuid references consult_note (id) on delete set null
);

create table attachment (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  file_url text not null,
  file_type text not null, -- pdf/image 등
  link_type attachment_link_type not null,
  link_id uuid,
  created_at timestamptz not null default now()
);

alter table expense
  add constraint expense_receipt_attachment_fk
  foreign key (receipt_attachment_id) references attachment (id) on delete set null;

create table honeymoon (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspace (id) on delete cascade, -- 워크스페이스당 1건(1:1)
  destination text not null,
  start_date date not null,
  end_date date not null
);

create table honeymoon_day (
  id uuid primary key default gen_random_uuid(),
  honeymoon_id uuid not null references honeymoon (id) on delete cascade,
  day_number int not null,
  title text not null,
  detail text,
  unique (honeymoon_id, day_number)
);

create table wedding_day_schedule (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  time time not null,
  title text not null,
  note text
);

create index on prep_item (workspace_id);
create index on prep_item (workspace_id, category);
create index on schedule_attr (scheduled_at);
create index on consult_note (workspace_id);
create index on prep_item_consult_note (consult_note_id);
create index on expense (workspace_id);
create index on expense (prep_item_id);
create index on guest_entry (workspace_id);
create index on vendor_contact (workspace_id);
create index on attachment (workspace_id);
create index on honeymoon_day (honeymoon_id);
create index on wedding_day_schedule (workspace_id);
