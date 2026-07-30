// backend/migrations/0001_init.sql의 membership 테이블과 짝을 맞춘 프론트 타입.
// role 타입/라벨은 src/shared/lib/rbac/permissions.ts가 단일 소스 — 여기선 재사용만 한다.
export type { MembershipRole as MemberRole } from '@/shared/lib/rbac/permissions';
export { ROLE_LABELS } from '@/shared/lib/rbac/permissions';
import type { MembershipRole } from '@/shared/lib/rbac/permissions';

export interface Member {
  id: string; // membership.id
  name: string;
  relationLabel: string; // "본인 (Master)", "남자친구", "친정 어머니" 등
  role: MembershipRole;
}
