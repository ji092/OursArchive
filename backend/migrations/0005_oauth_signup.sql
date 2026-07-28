-- OAuth(카카오/구글) 자가가입 + Master 승인 플로우 추가 (2026-07-27 사용자 지정).
-- 기존엔 Master가 이메일로 초대해야만 가입 가능했지만(invite_token), 이제 누구나 OAuth로 로그인해서
-- "가입 요청"을 만들 수 있고, Master가 검토 후 역할을 지정해 승인(status: pending → active)한다.
-- invite_token 플로우는 그대로 남겨둔다 — 두 경로 다 최종적으로 membership 행을 만드는 것은 같다.

alter table membership
  add column join_message text, -- 가입 요청 시 본인이 남긴 자기소개 메시지 (예: "지우 엄마예요")
  alter column role set default 'guest'; -- 자가가입은 항상 최소 권한(guest)로 시작, Master가 승인 시 실제 역할로 변경

-- 이 앱은 커플 1쌍이 쓰는 단일 워크스페이스 전제다(요구사항/PHASE0~6 전반). 아직 멤버가 아닌 사용자도
-- 가입 요청을 만들려면 "어느 workspace에 붙을지"는 알아야 하므로, workspace 테이블 전체를 열어주는
-- 대신 id만 돌려주는 함수를 둔다(security definer — 다른 컬럼은 노출하지 않는다).
create or replace function get_default_workspace_id()
returns uuid
language sql
security definer set search_path = public
as $$
  select id from workspace order by created_at asc limit 1;
$$;
