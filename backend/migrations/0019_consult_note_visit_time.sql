-- 상담노트를 상담 일정으로 승격 (2026-08-31)
--
-- 상담노트와 일정이 따로 움직이던 문제를 없애기 위해, 상담노트 자체를 일정으로 다룬다.
-- 일정으로 쓰려면 시각이 필요한데 visit_date는 date라 시간을 담지 못한다.
-- date 컬럼을 timestamptz로 바꾸지 않고 시각만 nullable 컬럼으로 덧붙인다:
--   - 기존 행은 그대로 "시각 없음(하루 종일)"으로 남는다.
--   - 되돌릴 때 컬럼만 지우면 되고, visit_date를 읽는 기존 코드가 깨지지 않는다.
alter table consult_note add column if not exists visit_time time;

comment on column consult_note.visit_time is '상담 방문 시각. null이면 시각 미정(달력에 "시간 미정"으로 표시).';
