import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyProfile, resolveAvatarUrl, updateNickname, uploadAvatar } from '../api';

export const myProfileQueryKey = (userId: string) => ['my-profile', userId] as const;

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: myProfileQueryKey(userId ?? ''),
    queryFn: () => fetchMyProfile(userId!),
    enabled: !!userId,
  });
}

export function useAvatarUrl(avatarPath: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', avatarPath ?? ''],
    queryFn: () => resolveAvatarUrl(avatarPath ?? null),
    enabled: !!avatarPath,
    staleTime: 30 * 60 * 1000,
  });
}

export function useUpdateNickname(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nickname: string) => updateNickname(userId!, nickname),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myProfileQueryKey(userId ?? '') }),
  });
}

export function useUploadAvatar(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(userId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myProfileQueryKey(userId ?? '') });
      // profiles.avatar_url이 바뀌었으니 GlobalHeader가 쓰는 membership 캐시는 그대로 두고
      // avatar-url 캐시만 무효화해도 되지만, 경로 자체가 바뀌지 않는 경우(같은 avatar.webp 덮어쓰기)가
      // 많아 signed URL을 새로 받아도 브라우저 캐시 이미지가 그대로일 수 있음 — 쿼리 캐시 자체를 지운다.
      queryClient.invalidateQueries({ queryKey: ['avatar-url'] });
    },
  });
}
