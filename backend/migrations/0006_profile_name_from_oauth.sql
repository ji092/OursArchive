-- 가입 요청 승인 화면(관리 페이지)에서 누가 요청했는지 보이도록, OAuth 로그인 시 카카오/구글이
-- 넘겨주는 이름/프로필사진을 profiles에도 채워넣는다 (2026-07-27). 기존 handle_new_user()는
-- id만 넣었어서 매 요청이 전부 "이름 없음"으로 보였다.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;
