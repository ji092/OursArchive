-- 요구사항 7.3: pregnancy 카테고리는 love/wedding과 달리 family(visibility='family')·guest(visibility='guest',
-- active)에게도 읽기(+family는 댓글)를 연다. 단, checkup/health_log/prenatal_letter는 5.4 스키마에
-- visibility 컬럼이 없다 — 임신 다이어리·육아 기록과 달리 가족 공유 대상이 아닌 부부 전용 관리 데이터로
-- 설계했기 때문 (목업에도 검진/건강기록은 "가족 공유" 표시가 없고 성장일기에만 있었음).

create or replace function can_read_pregnancy_content(ws uuid, vis content_visibility)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from membership m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
      and (
        m.role in ('master', 'partner')
        or (m.role = 'family' and vis = 'family')
        or (m.role = 'guest' and vis = 'guest')
      )
  );
$$;

create or replace function can_comment_pregnancy_content(ws uuid, vis content_visibility)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from membership m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
      and (m.role in ('master', 'partner') or (m.role = 'family' and vis = 'family'))
  );
$$;

alter table pregnancy_diary enable row level security;
alter table diary_photo enable row level security;
alter table checkup enable row level security;
alter table health_log enable row level security;
alter table prenatal_letter enable row level security;
alter table baby_record enable row level security;
alter table baby_photo enable row level security;
alter table pregnancy_event enable row level security;
alter table pregnancy_expense enable row level security;

create policy pregnancy_diary_select on pregnancy_diary
  for select using (can_read_pregnancy_content(workspace_id, visibility));

create policy pregnancy_diary_write on pregnancy_diary
  for insert with check (can_access_couple_content(workspace_id));
create policy pregnancy_diary_update on pregnancy_diary
  for update using (can_access_couple_content(workspace_id));
create policy pregnancy_diary_delete on pregnancy_diary
  for delete using (can_access_couple_content(workspace_id));

create policy diary_photo_select on diary_photo
  for select using (
    exists (
      select 1 from pregnancy_diary d
      where d.id = diary_photo.diary_id and can_read_pregnancy_content(d.workspace_id, d.visibility)
    )
  );
create policy diary_photo_write on diary_photo
  for all using (
    exists (select 1 from pregnancy_diary d where d.id = diary_photo.diary_id and can_access_couple_content(d.workspace_id))
  );

-- checkup/health_log/prenatal_letter: 가족 공유 대상이 아님 — partner/master 전용 (위 주석 참조).
create policy checkup_all on checkup
  for all using (can_access_couple_content(workspace_id));
create policy health_log_all on health_log
  for all using (can_access_couple_content(workspace_id));
create policy prenatal_letter_all on prenatal_letter
  for all using (can_access_couple_content(workspace_id));

-- 일정(pregnancy_event): 검진 일정 등과 마찬가지로 가족 공유 없이 부부(+Master) 전용.
create policy pregnancy_event_all on pregnancy_event
  for all using (can_access_couple_content(workspace_id));

-- 지불(pregnancy_expense): Master·파트너만 조회/작성 가능 — family/guest는 접근 불가
-- (결혼 챕터의 wedding 카테고리 전체 접근 제한과 동일 원칙, 2026-07-27 사용자 지정).
create policy pregnancy_expense_all on pregnancy_expense
  for all using (can_access_couple_content(workspace_id));

create policy baby_record_select on baby_record
  for select using (can_read_pregnancy_content(workspace_id, visibility));
create policy baby_record_write on baby_record
  for insert with check (can_access_couple_content(workspace_id));
create policy baby_record_update on baby_record
  for update using (can_access_couple_content(workspace_id));
create policy baby_record_delete on baby_record
  for delete using (can_access_couple_content(workspace_id));

create policy baby_photo_select on baby_photo
  for select using (
    exists (
      select 1 from baby_record b
      where b.id = baby_photo.record_id and can_read_pregnancy_content(b.workspace_id, b.visibility)
    )
  );
create policy baby_photo_write on baby_photo
  for all using (
    exists (select 1 from baby_record b where b.id = baby_photo.record_id and can_access_couple_content(b.workspace_id))
  );

-- comment 테이블(0002_love.sql에서 생성)에 pregnancy_diary/baby_record 대상 정책을 추가한다.
create or replace function pregnancy_comment_accessible(target uuid, want_write boolean)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from pregnancy_diary d
    where d.id = target
      and (
        case when want_write then can_comment_pregnancy_content(d.workspace_id, d.visibility)
             else can_read_pregnancy_content(d.workspace_id, d.visibility) end
      )
  );
$$;

create or replace function baby_comment_accessible(target uuid, want_write boolean)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from baby_record b
    where b.id = target
      and (
        case when want_write then can_comment_pregnancy_content(b.workspace_id, b.visibility)
             else can_read_pregnancy_content(b.workspace_id, b.visibility) end
      )
  );
$$;

create policy comment_select_pregnancy_baby on comment
  for select using (
    (target_type = 'pregnancy_diary' and pregnancy_comment_accessible(target_id, false))
    or (target_type = 'baby_record' and baby_comment_accessible(target_id, false))
  );

create policy comment_insert_pregnancy_baby on comment
  for insert with check (
    author_id = auth.uid() and (
      (target_type = 'pregnancy_diary' and pregnancy_comment_accessible(target_id, true))
      or (target_type = 'baby_record' and baby_comment_accessible(target_id, true))
    )
  );

create policy comment_delete_own_pregnancy_baby on comment
  for delete using (
    target_type in ('pregnancy_diary', 'baby_record') and (
      author_id = auth.uid()
      or (target_type = 'pregnancy_diary' and exists (
        select 1 from pregnancy_diary d where d.id = comment.target_id and is_master(d.workspace_id)
      ))
      or (target_type = 'baby_record' and exists (
        select 1 from baby_record b where b.id = comment.target_id and is_master(b.workspace_id)
      ))
    )
  );
