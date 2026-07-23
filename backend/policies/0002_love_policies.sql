-- 요구사항 7.3 의사코드 구현: content.category in ['love','wedding'] → role=='partner'(또는 master)만 접근.
-- "서버가 먼저다" 원칙(CLAUDE.md) — RLS 없이 이 도메인은 미완성으로 간주한다.

create or replace function can_access_couple_content(ws uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from membership
    where workspace_id = ws and user_id = auth.uid()
      and status = 'active' and role in ('master', 'partner')
  );
$$;

-- 댓글은 부모 콘텐츠의 visibility/접근권을 그대로 상속한다 (요구사항 7.3, PHASE2 검토 반영).
-- 지금은 부모가 love_record인 경우만 실제로 존재하므로 그 경로만 구현한다.
create or replace function love_comment_accessible(target uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from love_record lr
    where lr.id = target and can_access_couple_content(lr.workspace_id)
  );
$$;

alter table love_record enable row level security;
alter table love_photo enable row level security;
alter table comment enable row level security;
alter table love_plan enable row level security;

-- love_record: 파트너/Master만 조회, 작성자 본인(또는 Master)만 수정·삭제 (요구사항 3.2.2 "더보기 — 본인 글만").
create policy love_record_select on love_record
  for select using (can_access_couple_content(workspace_id));

create policy love_record_insert on love_record
  for insert with check (can_access_couple_content(workspace_id) and author_id = auth.uid());

create policy love_record_update_own on love_record
  for update using (
    can_access_couple_content(workspace_id) and (author_id = auth.uid() or is_master(workspace_id))
  );

create policy love_record_delete_own on love_record
  for delete using (
    can_access_couple_content(workspace_id) and (author_id = auth.uid() or is_master(workspace_id))
  );

-- love_photo: 소속 love_record의 권한을 그대로 따른다.
create policy love_photo_select on love_photo
  for select using (
    exists (
      select 1 from love_record lr
      where lr.id = love_photo.record_id and can_access_couple_content(lr.workspace_id)
    )
  );

create policy love_photo_write on love_photo
  for all using (
    exists (
      select 1 from love_record lr
      where lr.id = love_photo.record_id
        and can_access_couple_content(lr.workspace_id)
        and (lr.author_id = auth.uid() or is_master(lr.workspace_id))
    )
  );

-- comment: 목록/작성은 파트너·Master 누구나, 삭제는 작성자 본인(또는 Master)만.
create policy comment_select on comment
  for select using (
    target_type = 'love_record' and love_comment_accessible(target_id)
  );

create policy comment_insert on comment
  for insert with check (
    target_type = 'love_record' and love_comment_accessible(target_id) and author_id = auth.uid()
  );

create policy comment_delete_own on comment
  for delete using (
    target_type = 'love_record' and (
      author_id = auth.uid()
      or exists (
        select 1 from love_record lr where lr.id = comment.target_id and is_master(lr.workspace_id)
      )
    )
  );

-- love_plan: 파트너/Master면 조회·생성·수정·삭제 모두 가능 (계획은 둘이 함께 관리, 작성자 단독 제약 없음).
create policy love_plan_select on love_plan
  for select using (can_access_couple_content(workspace_id));

create policy love_plan_write on love_plan
  for all using (can_access_couple_content(workspace_id));
