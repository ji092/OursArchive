import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveJoinRequest, fetchJoinRequests, rejectJoinRequest } from '../joinRequestsApi';
import type { MemberRole } from '../types';

const joinRequestsQueryKey = ['admin-join-requests'] as const;

export function useJoinRequests() {
  return useQuery({ queryKey: joinRequestsQueryKey, queryFn: fetchJoinRequests });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Exclude<MemberRole, 'master'> }) => approveJoinRequest(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: joinRequestsQueryKey }),
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectJoinRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: joinRequestsQueryKey }),
  });
}
