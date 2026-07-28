-- 요구사항 7.3: category='wedding'은 love와 동일하게 partner(+master)만 접근.
-- can_access_couple_content()는 0002_love_policies.sql에서 이미 정의됨 (재사용).

alter table prep_item enable row level security;
alter table checklist_attr enable row level security;
alter table schedule_attr enable row level security;
alter table budget_attr enable row level security;
alter table consult_note enable row level security;
alter table prep_item_consult_note enable row level security;
alter table expense enable row level security;
alter table guest_entry enable row level security;
alter table vendor_contact enable row level security;
alter table attachment enable row level security;
alter table honeymoon enable row level security;
alter table honeymoon_day enable row level security;
alter table honeymoon_day_photo enable row level security;
alter table wedding_day_schedule enable row level security;

create policy prep_item_all on prep_item
  for all using (can_access_couple_content(workspace_id));

-- *_attr 3종: prep_item을 통해 workspace 판정 (자체 workspace_id 컬럼이 없음, 4.1 통합 모델).
create policy checklist_attr_all on checklist_attr
  for all using (
    exists (select 1 from prep_item p where p.id = checklist_attr.prep_item_id and can_access_couple_content(p.workspace_id))
  );

create policy schedule_attr_all on schedule_attr
  for all using (
    exists (select 1 from prep_item p where p.id = schedule_attr.prep_item_id and can_access_couple_content(p.workspace_id))
  );

create policy budget_attr_all on budget_attr
  for all using (
    exists (select 1 from prep_item p where p.id = budget_attr.prep_item_id and can_access_couple_content(p.workspace_id))
  );

create policy consult_note_all on consult_note
  for all using (can_access_couple_content(workspace_id));

create policy prep_item_consult_note_all on prep_item_consult_note
  for all using (
    exists (select 1 from prep_item p where p.id = prep_item_consult_note.prep_item_id and can_access_couple_content(p.workspace_id))
  );

create policy expense_all on expense
  for all using (can_access_couple_content(workspace_id));

create policy guest_entry_all on guest_entry
  for all using (can_access_couple_content(workspace_id));

create policy vendor_contact_all on vendor_contact
  for all using (can_access_couple_content(workspace_id));

create policy attachment_all on attachment
  for all using (can_access_couple_content(workspace_id));

create policy honeymoon_all on honeymoon
  for all using (can_access_couple_content(workspace_id));

create policy honeymoon_day_all on honeymoon_day
  for all using (
    exists (select 1 from honeymoon h where h.id = honeymoon_day.honeymoon_id and can_access_couple_content(h.workspace_id))
  );

create policy honeymoon_day_photo_all on honeymoon_day_photo
  for all using (
    exists (
      select 1 from honeymoon_day d
      join honeymoon h on h.id = d.honeymoon_id
      where d.id = honeymoon_day_photo.day_id and can_access_couple_content(h.workspace_id)
    )
  );

create policy wedding_day_schedule_all on wedding_day_schedule
  for all using (can_access_couple_content(workspace_id));
