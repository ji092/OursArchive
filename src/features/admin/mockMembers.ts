import type { Member } from './types';

// Readdy 프론트 목업(2026-07-22 검토)에 나온 구성원 그대로.
export const mockMembers: Member[] = [
  { id: 'member-1', name: '지우', email: 'jiwoo@oursarchive.love', relationLabel: '본인 (Master)', role: 'master', status: 'active' },
  { id: 'member-2', name: '현우', email: 'hyunwoo@oursarchive.love', relationLabel: '남자친구', role: 'partner', status: 'active' },
  { id: 'member-3', name: '엄마', email: 'mom@oursarchive.love', relationLabel: '친정 어머니', role: 'family', status: 'active' },
  { id: 'member-4', name: '시어머니', email: 'mother@oursarchive.love', relationLabel: '시어머니', role: 'family', status: 'active' },
  { id: 'member-5', name: '언니', email: 'sister@oursarchive.love', relationLabel: '친언니', role: 'guest', status: 'invited' },
];
