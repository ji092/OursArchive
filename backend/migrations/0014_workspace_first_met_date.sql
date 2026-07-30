-- 관리 페이지의 "시작 · 첫만남" 필드 — 기존 workspace 테이블엔 couple_start_date(만나기로 한 날)/
-- wedding_date/due_date만 있고 first_met_date가 없었다(프론트 mock에만 존재). 컬럼을 추가한다.
alter table workspace add column if not exists first_met_date date;
