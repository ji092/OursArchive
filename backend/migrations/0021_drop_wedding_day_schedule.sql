-- 죽은 테이블 정리 (2026-09-01)
--
-- wedding_day_schedule은 0003_wedding.sql에서 만들어졌지만 프론트에서 한 번도 조회·삽입하지
-- 않는다(코드 전수 확인, 참조 0건). 본식 당일 타임라인은 결국 만들지 않았고, 결혼 일정은
-- prep_item + schedule_attr로 관리한다.
--
-- 테이블을 지우면 붙어 있던 트리거(wedding_day_schedule_notify)와 RLS 정책도 함께 사라진다.
-- 트리거가 쓰던 함수 trg_notify_schedule()은 love_plan/checkup/pregnancy_event 트리거가
-- 계속 쓰므로 남겨둔다.
drop table if exists wedding_day_schedule;
