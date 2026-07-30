-- prep_item + 3개 1:1 attr 테이블(checklist_attr/schedule_attr/budget_attr) + M:M
-- prep_item_consult_note를 프론트는 하나의 객체로 다루므로, 원자적 다중 insert/update가 필요하다.
-- security invoker(기본값)로 만들어 각 문장에 호출자의 RLS(can_access_couple_content)가 그대로 걸리게 한다
-- — service role 우회 없이 함수 자체가 "한 트랜잭션짜리 클라이언트 호출"일 뿐이다.

create or replace function create_prep_item(
  ws uuid,
  p_title text,
  p_category wedding_category,
  p_assignee_id uuid,
  p_checklist jsonb,
  p_schedule jsonb,
  p_budget jsonb,
  p_consult_note_ids uuid[]
)
returns uuid
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into prep_item (workspace_id, title, category, assignee_id)
  values (ws, p_title, p_category, p_assignee_id)
  returning id into new_id;

  if p_checklist is not null then
    insert into checklist_attr (prep_item_id, done, due_date)
    values (new_id, coalesce((p_checklist->>'done')::boolean, false), (p_checklist->>'dueDate')::date);
  end if;

  if p_schedule is not null then
    insert into schedule_attr (prep_item_id, scheduled_at, location, event_type)
    values (new_id, (p_schedule->>'scheduledAt')::timestamptz, p_schedule->>'location', (p_schedule->>'eventType')::wedding_event_type);
  end if;

  if p_budget is not null then
    insert into budget_attr (
      prep_item_id, planned_amount,
      deposit_amount, deposit_method, deposit_memo,
      interim_amount, interim_method, interim_memo,
      balance_amount, balance_method, balance_memo,
      used_amount
    ) values (
      new_id, coalesce((p_budget->>'plannedAmount')::bigint, 0),
      coalesce((p_budget->'deposit'->>'amount')::bigint, 0), nullif(p_budget->'deposit'->>'method', '')::payment_method, coalesce(p_budget->'deposit'->>'memo', ''),
      coalesce((p_budget->'interim'->>'amount')::bigint, 0), nullif(p_budget->'interim'->>'method', '')::payment_method, coalesce(p_budget->'interim'->>'memo', ''),
      coalesce((p_budget->'balance'->>'amount')::bigint, 0), nullif(p_budget->'balance'->>'method', '')::payment_method, coalesce(p_budget->'balance'->>'memo', ''),
      coalesce((p_budget->>'usedAmount')::bigint, 0)
    );
  end if;

  if p_consult_note_ids is not null and array_length(p_consult_note_ids, 1) > 0 then
    insert into prep_item_consult_note (prep_item_id, consult_note_id)
    select new_id, unnest(p_consult_note_ids);
  end if;

  return new_id;
end;
$$;

create or replace function update_prep_item(
  item_id uuid,
  p_title text,
  p_category wedding_category,
  p_assignee_id uuid,
  p_checklist jsonb,
  p_schedule jsonb,
  p_budget jsonb,
  p_consult_note_ids uuid[]
)
returns void
language plpgsql
as $$
begin
  update prep_item
  set title = p_title, category = p_category, assignee_id = p_assignee_id, updated_at = now()
  where id = item_id;

  if p_checklist is null then
    delete from checklist_attr where prep_item_id = item_id;
  else
    insert into checklist_attr (prep_item_id, done, due_date)
    values (item_id, coalesce((p_checklist->>'done')::boolean, false), (p_checklist->>'dueDate')::date)
    on conflict (prep_item_id) do update set done = excluded.done, due_date = excluded.due_date;
  end if;

  if p_schedule is null then
    delete from schedule_attr where prep_item_id = item_id;
  else
    insert into schedule_attr (prep_item_id, scheduled_at, location, event_type)
    values (item_id, (p_schedule->>'scheduledAt')::timestamptz, p_schedule->>'location', (p_schedule->>'eventType')::wedding_event_type)
    on conflict (prep_item_id) do update set scheduled_at = excluded.scheduled_at, location = excluded.location, event_type = excluded.event_type;
  end if;

  if p_budget is null then
    delete from budget_attr where prep_item_id = item_id;
  else
    insert into budget_attr (
      prep_item_id, planned_amount,
      deposit_amount, deposit_method, deposit_memo,
      interim_amount, interim_method, interim_memo,
      balance_amount, balance_method, balance_memo,
      used_amount
    ) values (
      item_id, coalesce((p_budget->>'plannedAmount')::bigint, 0),
      coalesce((p_budget->'deposit'->>'amount')::bigint, 0), nullif(p_budget->'deposit'->>'method', '')::payment_method, coalesce(p_budget->'deposit'->>'memo', ''),
      coalesce((p_budget->'interim'->>'amount')::bigint, 0), nullif(p_budget->'interim'->>'method', '')::payment_method, coalesce(p_budget->'interim'->>'memo', ''),
      coalesce((p_budget->'balance'->>'amount')::bigint, 0), nullif(p_budget->'balance'->>'method', '')::payment_method, coalesce(p_budget->'balance'->>'memo', ''),
      coalesce((p_budget->>'usedAmount')::bigint, 0)
    )
    on conflict (prep_item_id) do update set
      planned_amount = excluded.planned_amount,
      deposit_amount = excluded.deposit_amount, deposit_method = excluded.deposit_method, deposit_memo = excluded.deposit_memo,
      interim_amount = excluded.interim_amount, interim_method = excluded.interim_method, interim_memo = excluded.interim_memo,
      balance_amount = excluded.balance_amount, balance_method = excluded.balance_method, balance_memo = excluded.balance_memo,
      used_amount = excluded.used_amount;
  end if;

  delete from prep_item_consult_note
  where prep_item_id = item_id
    and (p_consult_note_ids is null or not (consult_note_id = any(p_consult_note_ids)));

  if p_consult_note_ids is not null and array_length(p_consult_note_ids, 1) > 0 then
    insert into prep_item_consult_note (prep_item_id, consult_note_id)
    select item_id, unnest(p_consult_note_ids)
    on conflict do nothing;
  end if;
end;
$$;

-- honeymoon(워크스페이스당 1건) + honeymoon_day를 프론트가 "통째로 교체" 방식으로 저장하므로
-- day는 전부 지우고 다시 넣는 편이 diff 로직보다 단순하고 정확하다.
create or replace function save_honeymoon(
  ws uuid,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_days jsonb
)
returns uuid
language plpgsql
as $$
declare
  hm_id uuid;
  day jsonb;
  keep_ids uuid[];
begin
  insert into honeymoon (workspace_id, destination, start_date, end_date)
  values (ws, p_destination, p_start_date, p_end_date)
  on conflict (workspace_id) do update set destination = excluded.destination, start_date = excluded.start_date, end_date = excluded.end_date
  returning id into hm_id;

  -- day.id는 프론트가 "일정 추가" 시점에 이미 crypto.randomUUID()로 만들어 넘긴다(WeddingHoneymoonView.tsx
  -- addDay()) — 그 id로 upsert해야 honeymoon_day_photo(day_id FK)가 매 저장마다 끊기지 않는다.
  select array_agg((d->>'id')::uuid) into keep_ids from jsonb_array_elements(coalesce(p_days, '[]'::jsonb)) d;
  delete from honeymoon_day
  where honeymoon_id = hm_id and (keep_ids is null or not (id = any(keep_ids)));

  for day in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
  loop
    insert into honeymoon_day (
      id, honeymoon_id, day_number, title, detail, planned_amount, used_amount, payment_method, payment_memo
    ) values (
      (day->>'id')::uuid,
      hm_id,
      (day->>'dayNumber')::int,
      day->>'title',
      day->>'detail',
      coalesce((day->'budget'->>'plannedAmount')::bigint, 0),
      coalesce((day->'budget'->>'usedAmount')::bigint, 0),
      nullif(day->'budget'->>'method', '')::payment_method,
      coalesce(day->'budget'->>'memo', '')
    )
    on conflict (id) do update set
      day_number = excluded.day_number, title = excluded.title, detail = excluded.detail,
      planned_amount = excluded.planned_amount, used_amount = excluded.used_amount,
      payment_method = excluded.payment_method, payment_memo = excluded.payment_memo;
  end loop;

  return hm_id;
end;
$$;
