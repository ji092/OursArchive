import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import { invalidateCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import {
  createConsultNote,
  createExpense,
  createPrepItem,
  createVendorContact,
  deleteExpense,
  deletePrepItem,
  deleteVendorContact,
  deleteWeddingSchedule,
  fetchConsultNotes,
  fetchExpenses,
  fetchHoneymoon,
  fetchPrepItems,
  fetchVendorContacts,
  toggleChecklistDone,
  updateConsultNote,
  updateExpense,
  updateHoneymoon,
  updatePrepItem,
  updateVendorContact,
  type SaveExpenseInput,
  type SaveVendorContactInput,
} from '../api';

const prepItemsQueryKey = (workspaceId: string) => ['wedding-prep-items', workspaceId] as const;
const consultNotesQueryKey = (workspaceId: string) => ['wedding-consult-notes', workspaceId] as const;
const honeymoonQueryKey = (workspaceId: string) => ['wedding-honeymoon', workspaceId] as const;
const vendorContactsQueryKey = (workspaceId: string) => ['wedding-vendor-contacts', workspaceId] as const;
const expensesQueryKey = (workspaceId: string) => ['wedding-expenses', workspaceId] as const;

// 결혼 날짜는 관리 페이지(admin)에서 입력하는 workspace.wedding_date를 그대로 쓴다 (shared로 승격,
// 2026-07-23). 어느 챕터에도 속하지 않는 워크스페이스 공통 값이라 features/wedding 자체 저장을
// 두지 않는다.
export function useWeddingDate() {
  const { data, ...rest } = useWorkspaceSettings();
  return { ...rest, data: data?.weddingDate };
}

// 본식(결혼식) 일정 항목은 관리 페이지의 weddingDate를 그대로 따라간다 — 별도로 저장된
// scheduledAt 날짜가 관리 페이지에서 바꾼 결혼 날짜와 어긋나지 않도록 조회 시점에 덮어쓴다.
export function usePrepItems(workspaceId: string | undefined) {
  const { data: weddingDate } = useWeddingDate();
  const query = useQuery({
    queryKey: prepItemsQueryKey(workspaceId ?? ''),
    queryFn: () => fetchPrepItems(workspaceId!),
    enabled: !!workspaceId,
  });

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

export function useCreatePrepItem(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrepItem,
    onSuccess: () => invalidatePrepItemQueries(queryClient, workspaceId),
  });
}

export function useUpdatePrepItem(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePrepItem,
    onSuccess: () => invalidatePrepItemQueries(queryClient, workspaceId),
  });
}

export function useDeletePrepItem(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePrepItem,
    onSuccess: () => invalidatePrepItemQueries(queryClient, workspaceId),
  });
}

// 일정 삭제 — 체크리스트/예산이 함께 붙은 항목이면 일정 속성만 떼고 항목은 남긴다(api 주석 참조).
export function useDeleteWeddingSchedule(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWeddingSchedule,
    onSuccess: () => invalidatePrepItemQueries(queryClient, workspaceId),
  });
}

export function useToggleChecklistDone(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleChecklistDone,
    onSuccess: () => invalidatePrepItemQueries(queryClient, workspaceId),
  });
}

export function useConsultNotes(workspaceId: string | undefined) {
  return useQuery({
    queryKey: consultNotesQueryKey(workspaceId ?? ''),
    queryFn: () => fetchConsultNotes(workspaceId!),
    enabled: !!workspaceId,
  });
}

// 상담노트는 결혼 챕터 목록(consultNotesQueryKey)과 모든 달력이 함께 쓰는 통합 일정
// (calendarEventsQueryKey) 두 곳에서 읽힌다. 한쪽만 무효화하면 노트를 쓴 뒤 달력이 옛 값을
// 계속 보여주므로 항상 같이 무효화한다.
function invalidateConsultNoteQueries(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | undefined) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: consultNotesQueryKey(workspaceId ?? '') }),
    invalidateCalendarEvents(queryClient, workspaceId),
  ]);
}

// prep_item에는 일정(schedule_attr)이 붙을 수 있으므로 항목이 바뀌면 통합 일정도 같이 무효화한다.
function invalidatePrepItemQueries(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | undefined) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: prepItemsQueryKey(workspaceId ?? '') }),
    invalidateCalendarEvents(queryClient, workspaceId),
  ]);
}

export function useCreateConsultNote(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConsultNote,
    onSuccess: () => invalidateConsultNoteQueries(queryClient, workspaceId),
  });
}

export function useUpdateConsultNote(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateConsultNote,
    onSuccess: () => invalidateConsultNoteQueries(queryClient, workspaceId),
  });
}

export function useHoneymoon(workspaceId: string | undefined) {
  return useQuery({
    queryKey: honeymoonQueryKey(workspaceId ?? ''),
    queryFn: () => fetchHoneymoon(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useUpdateHoneymoon(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (honeymoon: Parameters<typeof updateHoneymoon>[1]) => updateHoneymoon(workspaceId!, honeymoon),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: honeymoonQueryKey(workspaceId ?? '') }),
        invalidateCalendarEvents(queryClient, workspaceId),
      ]),
  });
}

export function useVendorContacts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: vendorContactsQueryKey(workspaceId ?? ''),
    queryFn: () => fetchVendorContacts(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateVendorContact(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveVendorContactInput) => createVendorContact(workspaceId!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorContactsQueryKey(workspaceId ?? '') }),
  });
}

export function useUpdateVendorContact(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveVendorContactInput }) => updateVendorContact(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorContactsQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteVendorContact(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVendorContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorContactsQueryKey(workspaceId ?? '') }),
  });
}

export function useExpenses(workspaceId: string | undefined) {
  return useQuery({
    queryKey: expensesQueryKey(workspaceId ?? ''),
    queryFn: () => fetchExpenses(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateExpense(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveExpenseInput) => createExpense(workspaceId!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesQueryKey(workspaceId ?? '') }),
  });
}

export function useUpdateExpense(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveExpenseInput }) => updateExpense(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteExpense(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesQueryKey(workspaceId ?? '') }),
  });
}
