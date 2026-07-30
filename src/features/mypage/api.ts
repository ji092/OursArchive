import { supabase } from '@/shared/lib/api/supabaseClient';
import { compressImageToWebp } from '@/shared/lib/storage/imageCompress';
import { fetchMyMembership } from '@/shared/lib/auth/authApi';
import type { MyProfile } from './types';

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1시간 — 매번 새로 발급하므로 길게 잡을 필요 없음

export async function fetchMyProfile(userId: string): Promise<MyProfile> {
  const [{ data: profile, error }, membership] = await Promise.all([
    supabase.from('profiles').select('id, nickname, avatar_url').eq('id', userId).single(),
    fetchMyMembership(userId),
  ]);
  if (error) throw error;
  return {
    id: profile.id,
    nickname: profile.nickname,
    avatarPath: profile.avatar_url,
    role: membership?.role ?? null,
  };
}

export async function updateNickname(userId: string, nickname: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ nickname }).eq('id', userId);
  if (error) throw error;
}

// avatarPath는 OAuth 로그인 시 채워진 카카오 프로필 URL(https://...)일 수도, 여기서 업로드한
// "avatars" 버킷 경로("<userId>/avatar.webp")일 수도 있다 — 후자만 signed URL 발급이 필요하다.
export async function resolveAvatarUrl(avatarPath: string | null): Promise<string | null> {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(avatarPath, AVATAR_SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadAvatar(userId: string, file: File): Promise<void> {
  const compressed = await compressImageToWebp(file);
  const path = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, compressed, { upsert: true, contentType: 'image/webp' });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId);
  if (updateError) throw updateError;
}
