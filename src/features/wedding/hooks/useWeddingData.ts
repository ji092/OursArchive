import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import {
  createConsultNote,
  createPrepItem,
  deletePrepItem,
  fetchConsultNotes,
  fetchHoneymoon,
  fetchPrepItems,
  toggleChecklistDone,
  updateHoneymoon,
  updatePrepItem,
} from '../api';

export const prepItemsQueryKey = ['wedding-prep-items'] as const;
export const consultNotesQueryKey = ['wedding-consult-notes'] as const;
export const honeymoonQueryKey = ['wedding-honeymoon'] as const;

// 결혼 날짜는 관리 페이지(admin)에서 입력하는 workspace.wedding_date를 그대로 쓴다 (shared로 승격,
// 2026-07-23). 어느 챕터에도 속하지 않는 워크스페이스 공통 값이라 features/wedding 자체 저장을
// 두지 않는다.
export function useWeddingDate() {
  const { data, ...rest } = useWorkspaceSettings();
  return { ...rest, data: data?.weddingDate };
}

// 본식(결혼식) 일정 항목은 관리 페이지의 weddingDate를 그대로 따라간다 — 별도로 저장된
// scheduledAt 날짜가 관리 페이지에서 바꾼 결혼 날짜와 어긋나지 않도록 조회 시점에 덮어쓴다.
export function usePrepItems() {
  const { data: weddingDate } = useWeddingDate();
  const query = useQuery({ queryKey: prepItemsQueryKey, queryFn: fetchPrepItems });

  const data = useMemo(() => {
    if (!query.data || !weddingDate) return query.data;
    return query.data.map((item) =>
      item.schedule?.eventType === '본식'
        ? { ...item, schedule: { ...item.schedule, scheduledAt: `${weddingDate}${item.schedule.scheduledAt.slice(10)}` } }
        : item,
    );
  }, [query.data, weddingDate]);

  return { ...query, data };
}

export function useCreatePrepItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrepItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prepItemsQueryKey }),
  });
}

export function useUpdatePrepItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePrepItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prepItemsQueryKey }),
  });
}

export function useDeletePrepItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePrepItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prepItemsQueryKey }),
  });
}

export function useToggleChecklistDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleChecklistDone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prepItemsQueryKey }),
  });
}

export function useConsultNotes() {
  return useQuery({ queryKey: consultNotesQueryKey, queryFn: fetchConsultNotes });
}

export function useCreateConsultNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConsultNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: consultNotesQueryKey }),
  });
}

export function useHoneymoon() {
  return useQuery({ queryKey: honeymoonQueryKey, queryFn: fetchHoneymoon });
}

export function useUpdateHoneymoon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateHoneymoon,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: honeymoonQueryKey }),
  });
}
