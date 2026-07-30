-- 마이페이지 프로필 사진: 정식 R2 presigned 업로드 파이프라인(CLAUDE.md 8단계 흐름)은 아직 없어서
-- 이번엔 Supabase Storage에 임시로 직접 저장한다(2026-07-29 사용자 지정, R2 전환은 추후 별도 작업).
-- 경로 규칙: "<user_id>/avatar.webp" — 본인 폴더 하위에만 쓰게 해서 다른 사람 아바타를 덮어쓸 수 없게 한다.
-- 사진 자체는 민감 이미지로 보고(CLAUDE.md "민감 이미지는 signed URL로만 제공") 버킷을 private로 두고,
-- 클라이언트는 항상 createSignedUrl로 읽는다 — public select 정책을 두지 않는다.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 읽기는 같은 워크스페이스의 활성 멤버끼리만(다른 커플의 사진은 애초에 볼 일이 없지만,
-- profiles_select_self_or_shared_workspace와 동일 원칙으로 맞춘다).
drop policy if exists avatars_select_shared_workspace on storage.objects;
create policy avatars_select_shared_workspace on storage.objects
  for select using (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from membership m1
        join membership m2 on m1.workspace_id = m2.workspace_id
        where m1.user_id = auth.uid() and m1.status = 'active'
          and m2.user_id::text = (storage.foldername(name))[1] and m2.status = 'active'
      )
    )
  );
