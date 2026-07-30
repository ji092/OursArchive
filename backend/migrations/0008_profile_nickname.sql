-- 마이페이지: 카카오 실명(name)과 별개로 사용자가 자유롭게 바꿀 수 있는 닉네임을 추가한다.
-- 기존 name을 덮어쓰지 않기 위해 별도 컬럼으로 둔다 (2026-07-29 사용자 지정).

alter table profiles add column if not exists nickname text;

update profiles set nickname = name where nickname is null;
