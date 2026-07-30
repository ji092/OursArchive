-- 이메일 초대(invite_token) 체계 폐기 (docs/DECISIONS.md 2026-07-30).
-- 가입 경로는 카카오 OAuth 자가가입 + Master 승인(membership.status: pending → active) 하나뿐으로 확정.
-- invite_token을 실제로 쓰는 코드(invite-issue/invite-accept Edge Function, InviteAcceptPage)는
-- 전부 삭제됐다 — 이 테이블도 이제 아무도 안 쓴다. 정책은 테이블에 딸려 있어 테이블과 함께 사라진다.
drop table if exists invite_token;
drop type if exists invite_status;
