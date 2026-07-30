import type { MembershipRole } from '@/shared/lib/rbac/permissions';

export interface MyProfile {
  id: string;
  nickname: string | null;
  avatarPath: string | null; // storage.objects의 "avatars" 버킷 안 경로, signed URL은 필요할 때만 발급
  role: MembershipRole | null;
}
