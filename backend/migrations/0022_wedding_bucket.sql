-- 결혼 "버킷" — 카테고리별로 관심 있는 업체를 카드로 모아두는 목록 (2026-09-03 사용자 요청).
--
-- 상담노트(consult_note)와 다른 것:
--   consult_note = 이미 다녀왔거나 방문 날짜가 잡힌 상담. 방문일이 있어 달력에 서는 일정이다.
--   wedding_bucket = 아직 방문 전, "여기 괜찮아 보인다"고 담아두는 후보. 날짜가 없어 달력에 서지 않는다.
-- 그래서 consult_note에 컬럼을 더하지 않고 별도 테이블로 둔다.
--
-- 주소를 받는 이유: 업체 위치에 따라 헬퍼 추가금이 붙어 후보를 비교할 때 위치가 판단 근거가 된다
-- (사용자 지정). 좌표는 장소검색으로 채우며 없어도 된다.

-- 버킷 카테고리는 체크리스트·상담노트가 쓰는 wedding_category와 공유하지 않는다(2026-09-03 사용자 지정).
-- 버킷은 다른 테이블과 관계를 맺지 않는 독립 목록이고, 비교 단위가 준비 항목(스드메 묶음)이 아니라
-- 계약을 따로 하는 업체 단위(스튜디오/드레스/메이크업/헤어 …)로 훨씬 잘게 나뉘기 때문이다.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'bucket_category') then
    create type bucket_category as enum (
      '웨딩홀', '스튜디오', '드레스', '예복', '메이크업', '헤어', '부케',
      '본식스냅', '본식영상', '서브스냅', '아이폰스냅', '식전식중영상',
      '혼주한복', '청첩장', '축의대'
    );
  end if;
end;
$$;

create table if not exists wedding_bucket (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace (id) on delete cascade,
  category bucket_category not null, -- 버킷 전용 enum (위 주석 참조)
  vendor_name text not null,
  address text not null default '', -- 지역/주소 (헬퍼 추가금 판단용)
  lat double precision,
  lng double precision,
  link_url text not null default '', -- 업체 홈페이지/인스타 등
  memo text not null default '', -- 특징 메모
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wedding_bucket_workspace_idx on wedding_bucket (workspace_id);

-- 사진은 attachment(link_type enum)를 늘리지 않고 전용 테이블로 둔다 — 카드마다 "대표 1장"이라는
-- 제약이 있어서, 그 제약을 DB에서 직접 걸 수 있는 자리가 필요하기 때문이다(아래 부분 유니크 인덱스).
create table if not exists wedding_bucket_photo (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references wedding_bucket (id) on delete cascade,
  path text not null, -- content-photos 버킷 안 경로. 규칙: <workspace_id>/wedding_bucket/<bucket_id>/<n>.webp
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists wedding_bucket_photo_bucket_idx on wedding_bucket_photo (bucket_id);

-- 대표 사진은 카드당 최대 1장. UI 검증만으로는 두 탭에서 동시에 바꿀 때 둘 다 통과할 수 있어
-- DB에서 막는다. 대표를 안 고른 카드도 있을 수 있으므로 부분 인덱스(where is_cover)다.
create unique index if not exists wedding_bucket_photo_cover_idx
  on wedding_bucket_photo (bucket_id) where is_cover;

-- 대표 사진 교체. 클라이언트가 "기존 대표 해제 → 새 대표 지정" 두 문장을 따로 보내면 그 사이에
-- 다른 사람이 같은 카드의 대표를 바꿀 때 위 유니크 인덱스에 걸려 실패하거나, 해제만 되고 지정이
-- 실패해 대표 없는 카드가 남는다. 한 트랜잭션으로 묶어 그 창을 없앤다.
-- security definer가 아니라 invoker로 둔다 — 호출자의 RLS가 그대로 판정해야 남의 워크스페이스
-- 사진을 대표로 만들 수 없다.
create or replace function set_wedding_bucket_cover(p_photo_id uuid)
returns void
language plpgsql
as $$
declare
  target_bucket uuid;
begin
  select bucket_id into target_bucket from wedding_bucket_photo where id = p_photo_id;
  if target_bucket is null then
    raise exception '사진을 찾을 수 없습니다.';
  end if;

  update wedding_bucket_photo set is_cover = false where bucket_id = target_bucket and is_cover;
  update wedding_bucket_photo set is_cover = true where id = p_photo_id;
end;
$$;

create or replace function trg_wedding_bucket_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists wedding_bucket_touch on wedding_bucket;
create trigger wedding_bucket_touch before update on wedding_bucket
  for each row execute function trg_wedding_bucket_touch();
