-- OAuth 자가가입 시 본인 명의로 "pending" 요청 1건만 만들 수 있게 연다. status/role을 직접
-- active나 master/partner로 넣어 권한을 스스로 올리는 걸 막기 위해 with check로 값을 고정한다.
-- 승인(active로 전환 + 실제 role 지정)은 기존 membership_update_master 정책(Master 전용)이 처리한다.
create policy membership_insert_self_request on membership
  for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and role = 'guest'
    and invited_by is null
  );

grant execute on function get_default_workspace_id() to authenticated;
