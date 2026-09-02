import type { MembershipRole } from '@/shared/lib/rbac/permissions';

// backend/migrations/0016_schedule_ack.sql의 schedule_source_type과 짝을 맞춘다.
// wedding_day_schedule은 프론트에서 안 쓰는 죽은 테이블이라 빠져 있다.
// consult_note/checklist_due는 2026-09-03에 추가했다(0023) — 결혼 챕터에서 실제로 쓰는 일정이
// 이 둘이라, 알림 대상에 없으면 결혼 일정은 하나도 울리지 않는다.
export type ScheduleSourceType =
  | 'love_plan'
  | 'wedding_schedule'
  | 'consult_note'
  | 'checklist_due'
  | 'pregnancy_checkup'
  | 'pregnancy_event';

// 확인 요청 대상 role — love/wedding/pregnancy는 master·partner만 접근 가능해 이 둘로 제한한다.
export type AckRole = Extract<MembershipRole, 'master' | 'partner'>;

export interface ScheduleComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}
