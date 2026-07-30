import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from '../api';

export const notificationsQueryKey = (userId: string) => ['notifications', userId] as const;

// 실시간/Realtime 인프라가 아직 없어서(2026-07-29 사용자 지정) 폴링으로 새 알림을 감지한다.
export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: notificationsQueryKey(userId ?? ''),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 45_000,
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId ?? '') }),
  });
}
