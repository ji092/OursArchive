-- 요구사항 변경(2026-07-29 사용자 지정): family는 지금 단계에서 임신 다이어리를 포함해 아무것도
-- 볼 수 없다. family 공유는 아기가 태어난 뒤 baby_record/baby_photo(visibility='family')로만 연다
-- — 그 정책(0004_pregnancy_baby_policies.sql)은 그대로 두고, pregnancy_diary/diary_photo와
-- 그 댓글만 couple 전용으로 되돌린다.

drop policy if exists pregnancy_diary_select on pregnancy_diary;
create policy pregnancy_diary_select on pregnancy_diary
  for select using (can_access_couple_content(workspace_id));

drop policy if exists diary_photo_select on diary_photo;
create policy diary_photo_select on diary_photo
  for select using (
    exists (
      select 1 from pregnancy_diary d
      where d.id = diary_photo.diary_id and can_access_couple_content(d.workspace_id)
    )
  );

-- pregnancy_comment_accessible은 comment_select_pregnancy_baby/comment_insert_pregnancy_baby
-- (0004_pregnancy_baby_policies.sql)가 이미 참조하고 있으므로, 함수 본문만 couple 전용으로 교체한다
-- (정책 재작성 불필요 — want_write 인자는 더 이상 분기에 안 쓰이지만 시그니처는 호출부 호환을 위해 유지).
create or replace function pregnancy_comment_accessible(target uuid, want_write boolean)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from pregnancy_diary d
    where d.id = target and can_access_couple_content(d.workspace_id)
  );
$$;
