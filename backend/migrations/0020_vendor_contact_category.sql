-- 업체 연락처에 항목(카테고리) 추가 (2026-09-01)
--
-- 상담노트에 연락처를 입력하면 업체 연락처 카드가 자동으로 생기게 하면서, 카드에도
-- 상담노트와 같은 항목(웨딩홀/스드메/…)을 표시하기 위해 컬럼을 추가한다.
-- 상담노트에서 파생시키지 않고 컬럼으로 둔 이유: 상담노트 없이 직접 만든 연락처에도
-- 항목을 지정할 수 있어야 하고, 노트를 지워도(consult_note_id는 on delete set null)
-- 카드에 남은 항목이 사라지면 안 되기 때문이다.
alter table vendor_contact add column if not exists category wedding_category;
