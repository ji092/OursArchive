-- 버킷(wedding_bucket / wedding_bucket_photo) RLS — 결혼 챕터의 다른 테이블과 같은 규칙:
-- master/partner만 접근(can_access_couple_content, 0002_love_policies.sql에서 정의).
-- 0022_wedding_bucket.sql을 먼저 실행한 뒤 이 파일을 실행한다.
--
-- 사진 저장 자체(content-photos 버킷)는 0011_content_photos_storage.sql의 정책이 경로 첫 세그먼트
-- (workspace_id)로 이미 판정하므로 Storage 정책은 새로 만들 것이 없다.

alter table wedding_bucket enable row level security;
alter table wedding_bucket_photo enable row level security;

drop policy if exists wedding_bucket_all on wedding_bucket;
create policy wedding_bucket_all on wedding_bucket
  for all using (can_access_couple_content(workspace_id));

-- 사진은 자체 workspace_id 컬럼이 없으므로 부모 카드를 통해 판정한다(honeymoon_day_photo와 같은 모양).
drop policy if exists wedding_bucket_photo_all on wedding_bucket_photo;
create policy wedding_bucket_photo_all on wedding_bucket_photo
  for all using (
    exists (
      select 1 from wedding_bucket b
      where b.id = wedding_bucket_photo.bucket_id and can_access_couple_content(b.workspace_id)
    )
  );

-- 대표 사진 교체 RPC는 security invoker라 위 정책이 그대로 적용된다.
-- anon(로그인 전)에게는 열어줄 이유가 없으므로 authenticated에게만 준다.
revoke execute on function set_wedding_bucket_cover(uuid) from public, anon;
grant execute on function set_wedding_bucket_cover(uuid) to authenticated;
