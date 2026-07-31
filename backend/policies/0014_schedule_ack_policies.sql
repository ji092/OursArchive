-- schedule_ack/schedule_comment: workspace_id를 직접 저장해두므로 can_access_couple_content()
-- 한 줄로 충분하다(0016_schedule_ack.sql 주석 참조). push_subscription은 본인 것만.

alter table schedule_ack enable row level security;
alter table schedule_comment enable row level security;
alter table push_subscription enable row level security;

drop policy if exists schedule_ack_all on schedule_ack;
create policy schedule_ack_all on schedule_ack
  for all using (can_access_couple_content(workspace_id))
  with check (can_access_couple_content(workspace_id));

drop policy if exists schedule_comment_select on schedule_comment;
create policy schedule_comment_select on schedule_comment
  for select using (can_access_couple_content(workspace_id));

drop policy if exists schedule_comment_insert on schedule_comment;
create policy schedule_comment_insert on schedule_comment
  for insert with check (can_access_couple_content(workspace_id) and author_id = auth.uid());

drop policy if exists schedule_comment_delete on schedule_comment;
create policy schedule_comment_delete on schedule_comment
  for delete using (can_access_couple_content(workspace_id) and (author_id = auth.uid() or is_master(workspace_id)));

drop policy if exists push_subscription_own on push_subscription;
create policy push_subscription_own on push_subscription
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
