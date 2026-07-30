-- notification: 본인 앞으로 온 것만 조회/읽음처리 가능. INSERT 정책은 두지 않는다 —
-- 생성은 0007_notifications.sql의 security definer 트리거(postgres 소유, RLS 우회)만 수행하고,
-- 클라이언트가 직접 notification에 insert할 길은 없게 막는다 (0001_init_policies.sql의
-- invite_token/membership과 동일 원칙).

alter table notification enable row level security;

drop policy if exists notification_select_own on notification;
create policy notification_select_own on notification
  for select using (recipient_user_id = auth.uid());

drop policy if exists notification_update_own on notification;
create policy notification_update_own on notification
  for update using (recipient_user_id = auth.uid());
