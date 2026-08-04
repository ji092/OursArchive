-- 시스템 실패를 사용자(Master)에게 알리기 위한 알림 종류 (2026-08-04, 실패 모드 분석 F4).
--
-- 배경: schedule-reminder-tick이 실패해도 아무 흔적이 남지 않았다. pg_cron은 실패한
-- http_post를 조용히 넘기고 15분 뒤 다시 부르기 때문에, 함수가 계속 죽어도 "알림이 안 오네"를
-- 사람이 눈치챌 때까지 아무도 모른다. 2026-08-01 ambiguous column 오류로 5회 연속 500이
-- 났을 때 실제로 그랬다.
--
-- 기존 종류(new_post/new_comment/schedule/role_changed/schedule_reminder)는 전부 "누가
-- 무엇을 했다"는 콘텐츠 알림이라, 시스템 장애를 여기 섞으면 화면에서 구분할 수 없다.
-- 그래서 별도 값으로 둔다.
do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'system_alert' and enumtypid = 'notification_type'::regtype) then
    alter type notification_type add value 'system_alert';
  end if;
end;
$$;
