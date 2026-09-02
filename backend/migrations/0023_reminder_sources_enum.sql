-- 알림 대상 소스 추가 (2026-09-03 사용자 지정): 상담노트 방문일, 체크리스트 기한.
--
-- 배경: 결혼 챕터에서 실제로 쓰는 일정은 상담노트(consult_note)와 체크리스트 기한
-- (checklist_attr.due_date)인데, 리마인더 함수 두 개가 보는 소스는 love_plan / schedule_attr /
-- checkup / pregnancy_event 4개뿐이었다. 그래서 결혼 일정은 알림이 하나도 나가지 않았다
-- (2026-09-03 프로덕션 조회로 확인 — schedule_attr 0건).
--
-- enum 값 추가와 그 값을 쓰는 함수 정의는 **같은 트랜잭션에 있으면 안 된다**
-- ("unsafe use of new value of enum type"). 그래서 이 파일에는 enum만 두고, 함수는
-- 0024_reminder_sources_functions.sql에서 따로 실행한다. 순서: 0023 → 0024.

do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'consult_note' and enumtypid = 'schedule_source_type'::regtype) then
    alter type schedule_source_type add value 'consult_note';
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'checklist_due' and enumtypid = 'schedule_source_type'::regtype) then
    alter type schedule_source_type add value 'checklist_due';
  end if;
end;
$$;
