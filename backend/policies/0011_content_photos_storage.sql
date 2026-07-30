-- love/wedding/pregnancy 사진 업로드용 공용 버킷 (2026-07-29 사용자 지정: 단일 버킷 + 경로별 구분).
-- 경로 규칙: "<workspace_id>/<table>/<record_id>/<n>.webp" — 첫 세그먼트가 workspace_id이므로
-- 0010_avatars_storage.sql과 달리 "본인 폴더"가 아니라 "본인 workspace 폴더" 기준으로 판정한다.
-- R2 presigned 파이프라인 전환 전까지 임시(2026-07-29 사용자 지정)로 avatars와 동일하게 private + signed URL만.

insert into storage.buckets (id, name, public)
values ('content-photos', 'content-photos', false)
on conflict (id) do nothing;

create policy content_photos_all on storage.objects
  for all using (
    bucket_id = 'content-photos'
    and can_access_couple_content(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'content-photos'
    and can_access_couple_content(((storage.foldername(name))[1])::uuid)
  );
