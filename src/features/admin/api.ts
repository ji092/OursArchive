import { mockMembers } from './mockMembers';
import type { Member, MemberRole } from './types';

// GET /workspaces/:id/members 등(API 명세 6.1)이 아직 연결되지 않았다. localStorage를 임시 서버로
// 쓴다 (다른 features/*/api.ts와 동일한 패턴). 실제 초대 발급/수락은 이미 만들어진
// backend/functions/invite-issue, invite-accept Edge Function이 있으므로, Supabase 프로젝트가
// 연결되는 시점에 이 파일만 해당 함수 호출로 교체하면 된다.
const MEMBERS_KEY = 'ours-archive:members';

function readMembers(): Member[] {
  const raw = localStorage.getItem(MEMBERS_KEY);
  if (!raw) return mockMembers;
  try {
    return JSON.parse(raw) as Member[];
  } catch {
    return mockMembers;
  }
}

function writeMembers(members: Member[]): void {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

export async function fetchMembers(): Promise<Member[]> {
  return readMembers();
}

export interface InviteMemberInput {
  email: string;
  relationLabel: string;
  role: Exclude<MemberRole, 'master'>;
}

export async function inviteMember(input: InviteMemberInput): Promise<Member> {
  const member: Member = {
    id: crypto.randomUUID(),
    name: input.email.split('@')[0],
    email: input.email,
    relationLabel: input.relationLabel,
    role: input.role,
    status: 'invited',
  };
  const members = readMembers();
  writeMembers([...members, member]);
  return member;
}

export async function updateMemberRole(id: string, role: MemberRole): Promise<void> {
  const members = readMembers();
  writeMembers(members.map((m) => (m.id === id ? { ...m, role } : m)));
}

export async function removeMember(id: string): Promise<void> {
  const members = readMembers();
  writeMembers(members.filter((m) => m.id !== id));
}
