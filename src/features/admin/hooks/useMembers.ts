import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMembers, removeMember, updateMemberRole } from '../api';
import type { MemberRole } from '../types';

export const membersQueryKey = ['admin-members'] as const;

export function useMembers() {
  return useQuery({ queryKey: membersQueryKey, queryFn: fetchMembers });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: MemberRole }) => updateMemberRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersQueryKey }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersQueryKey }),
  });
}
