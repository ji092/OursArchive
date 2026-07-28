-- 가입 요청 승인 화면: Master가 관리 페이지에서 "누가 요청했는지"를 보려면 pending 신청자의
-- profiles(name/avatar_url)도 읽어야 한다. 기존 profiles_select_self_or_shared_workspace 정책은
-- 양쪽 다 status='active'인 경우만 허용해서, 아직 승인 전인 pending 신청자의 프로필은 Master도
-- 못 봤다(이름이 항상 비어보임). permissive 정책이라 기존 것과 OR로 합쳐진다 — 대체가 아니라 추가.
create policy profiles_select_master_any_status on profiles
  for select using (
    exists (
      select 1 from membership m
      where m.user_id = profiles.id and is_master(m.workspace_id)
    )
  );
