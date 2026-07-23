-- 요구사항 7.2/7.3의 접근 판정을 실제 RLS로 구현. "서버가 먼저다" 원칙(CLAUDE.md) —
-- 이 정책이 없으면 이 커밋은 미완성으로 간주한다.
--
-- 설계: master/승인된 초대(invite_token)/멤버십(membership) INSERT는 클라이언트가 직접 하지
-- 않는다 (서버측 service role을 쓰는 Edge Function만 수행) — 그래서 이 테이블들은 INSERT 정책이
-- 없다(=authenticated 역할에게 기본 거부). 오직 SELECT/UPDATE/DELETE만 필요한 만큼 연다.

create or replace function is_active_member(ws uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from membership
    where workspace_id = ws and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function is_master(ws uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from membership
    where workspace_id = ws and user_id = auth.uid() and role = 'master' and status = 'active'
  );
$$;

alter table workspace enable row level security;
alter table profiles enable row level security;
alter table membership enable row level security;
alter table invite_token enable row level security;
alter table audit_log enable row level security;

-- workspace: 활성 멤버만 조회, master만 수정. 생성은 서버(Edge Function/service role)에서만.
create policy workspace_select_members on workspace
  for select using (is_active_member(id));

create policy workspace_update_master on workspace
  for update using (is_master(id));

-- profiles: 본인 행은 항상, 같은 워크스페이스의 활성 멤버끼리는 서로 조회 가능(작성자 표시 등에 필요).
create policy profiles_select_self_or_shared_workspace on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from membership m1
      join membership m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m1.status = 'active'
        and m2.user_id = profiles.id and m2.status = 'active'
    )
  );

create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- membership: 본인 행 조회 + master는 워크스페이스 전체 조회/수정/삭제(역할변경·승인·내보내기, 3.5.3).
create policy membership_select on membership
  for select using (user_id = auth.uid() or is_master(workspace_id));

create policy membership_update_master on membership
  for update using (is_master(workspace_id));

create policy membership_delete_master on membership
  for delete using (is_master(workspace_id));

-- invite_token: master만 자기 워크스페이스의 초대 목록을 보고 회수(revoke)할 수 있다.
-- 발급(insert)·수락 처리(used 마킹)는 토큰 해시를 다루는 민감 로직이라 Edge Function에서만 수행.
create policy invite_select_master on invite_token
  for select using (is_master(workspace_id));

create policy invite_update_master on invite_token
  for update using (is_master(workspace_id));

-- audit_log: master만 조회. 기록(insert)은 Edge Function(service role)에서만.
create policy audit_select_master on audit_log
  for select using (is_master(workspace_id));
