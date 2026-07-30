-- week_content는 전역 참조 테이블(주차별 성장 정보) — 기존 프론트 mockWeekContent.ts(18주차 1건)를
-- 그대로 시드한다. 나머지 주차는 콘텐츠 준비되는 대로 추가 마이그레이션으로 채운다.
insert into week_content (week_no, size_metaphor, weight_g, length_cm, development, mother_tip)
values (18, '고구마', 190, 14.2, '청각이 발달해 엄마 목소리를 듣기 시작해요.', '태동을 느끼기 시작할 시기예요. 무리한 움직임은 피하고 충분히 쉬어주세요.')
on conflict (week_no) do nothing;
