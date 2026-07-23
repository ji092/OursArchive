// backend/migrations/0001_init.sql의 membership 테이블과 짝을 맞춘 프론트 타입.
export type MemberRole = 'master' | 'partner' | 'family' | 'guest';
export type MemberStatus = 'active' | 'invited' | 'pending';

export interface Member {
  id: string;
  name: string;
  email: string;
  relationLabel: string; // "본인 (Master)", "남자친구", "친정 어머니" 등
  role: MemberRole;
  status: MemberStatus;
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  master: 'Master',
  partner: '애인',
  family: '가족',
  guest: '게스트',
};
