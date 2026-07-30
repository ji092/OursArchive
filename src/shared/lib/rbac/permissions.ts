// backend/migrations/0001_init.sql의 membership_role enum과 짝을 맞춘 프론트 타입.
// role 판정 로직은 전부 이 파일에만 둔다 (CLAUDE.md 폴더 규칙 — 컴포넌트에 role === ... 하드코딩 금지).
export type MembershipRole = 'master' | 'partner' | 'family' | 'guest';

export const ROLE_LABELS: Record<MembershipRole, string> = {
  master: 'Master',
  partner: '애인',
  family: '가족',
  guest: '게스트',
};

// love/wedding/pregnancy(임신 다이어리) 챕터는 master·partner만 접근한다 — 서버 RLS(can_access_couple_content)와
// 동일한 규칙을 프론트 라우트 가드에서도 써야 하므로 여기 하나로 모은다.
export function canAccessCoupleContent(role: MembershipRole | null | undefined): boolean {
  return role === 'master' || role === 'partner';
}

export function isMaster(role: MembershipRole | null | undefined): boolean {
  return role === 'master';
}
