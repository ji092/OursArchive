import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import { invalidateCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import {
  addDiaryComment,
  createCheckup,
  createDiary,
  createEvent,
  createExpense,
  createHealthLog,
  deleteCheckup,
  deleteDiaryComment,
  deleteEvent,
  deleteExpense,
  deleteHealthLog,
  fetchCheckups,
  fetchDiaries,
  fetchEvents,
  fetchExpenses,
  fetchHealthLogs,
  fetchWeekContent,
  updateCheckup,
  updateEvent,
  updateExpense,
  type SaveCheckupInput,
  type SaveEventInput,
  type SaveExpenseInput,
} from '../api';

// 검진·일정은 임신 챕터 화면과 모든 달력이 함께 쓰는 통합 일정 양쪽에서 읽힌다.
function invalidateScheduleQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string | undefined,
  ownKey: readonly unknown[],
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ownKey }),
    invalidateCalendarEvents(queryClient, workspaceId),
  ]);
}

const diariesQueryKey = (workspaceId: string) => ['pregnancy-diaries', workspaceId] as const;
const checkupsQueryKey = (workspaceId: string) => ['pregnancy-checkups', workspaceId] as const;
const eventsQueryKey = (workspaceId: string) => ['pregnancy-events', workspaceId] as const;
const expensesQueryKey = (workspaceId: string) => ['pregnancy-expenses', workspaceId] as const;
const healthLogsQueryKey = (workspaceId: string) => ['pregnancy-health-logs', workspaceId] as const;

// 출산 예정일은 관리 페이지(admin)에서 입력하는 workspace.due_date를 그대로 쓴다 (shared로 승격,
// 2026-07-23).
export function useDueDate() {
  const { data, ...rest } = useWorkspaceSettings();
  return { ...rest, data: data?.dueDate };
}

export function useDiaries(workspaceId: string | undefined) {
  return useQuery({ queryKey: diariesQueryKey(workspaceId ?? ''), queryFn: () => fetchDiaries(workspaceId!), enabled: !!workspaceId });
}

export function useCreateDiary(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDiary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diariesQueryKey(workspaceId ?? '') }),
  });
}

export function useAddDiaryComment(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addDiaryComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diariesQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteDiaryComment(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDiaryComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diariesQueryKey(workspaceId ?? '') }),
  });
}

export function useCheckups(workspaceId: string | undefined) {
  return useQuery({ queryKey: checkupsQueryKey(workspaceId ?? ''), queryFn: () => fetchCheckups(workspaceId!), enabled: !!workspaceId });
}

export function useCreateCheckup(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCheckupInput) => createCheckup(workspaceId!, input),
    onSuccess: () => invalidateScheduleQueries(queryClient, workspaceId, checkupsQueryKey(workspaceId ?? '')),
  });
}

export function useUpdateCheckup(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveCheckupInput }) => updateCheckup(id, input),
    onSuccess: () => invalidateScheduleQueries(queryClient, workspaceId, checkupsQueryKey(workspaceId ?? '')),
  });
}

export function useDeleteCheckup(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCheckup,
    onSuccess: () => invalidateScheduleQueries(queryClient, workspaceId, checkupsQueryKey(workspaceId ?? '')),
  });
}

export function useWeekContent(weekNo: number) {
  return useQuery({ queryKey: ['pregnancy-week-content', weekNo], queryFn: () => fetchWeekContent(weekNo) });
}

export function useEvents(workspaceId: string | undefined) {
  return useQuery({ queryKey: eventsQueryKey(workspaceId ?? ''), queryFn: () => fetchEvents(workspaceId!), enabled: !!workspaceId });
}

export function useCreateEvent(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveEventInput) => createEvent(workspaceId!, input),
    onSuccess: () => invalidateScheduleQueries(queryClient, workspaceId, eventsQueryKey(workspaceId ?? '')),
  });
}

export function useUpdateEvent(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveEventInput }) => updateEvent(id, input),
    onSuccess: () => invalidateScheduleQueries(queryClient, workspaceId, eventsQueryKey(workspaceId ?? '')),
  });
}

export function useDeleteEvent(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => invalidateScheduleQueries(queryClient, workspaceId, eventsQueryKey(workspaceId ?? '')),
  });
}

export function useExpenses(workspaceId: string | undefined) {
  return useQuery({ queryKey: expensesQueryKey(workspaceId ?? ''), queryFn: () => fetchExpenses(workspaceId!), enabled: !!workspaceId });
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

export function useHealthLogs(workspaceId: string | undefined) {
  return useQuery({ queryKey: healthLogsQueryKey(workspaceId ?? ''), queryFn: () => fetchHealthLogs(workspaceId!), enabled: !!workspaceId });
}

export function useCreateHealthLog(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createHealthLog>[1]) => createHealthLog(workspaceId!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: healthLogsQueryKey(workspaceId ?? '') }),
  });
}

export function useDeleteHealthLog(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHealthLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: healthLogsQueryKey(workspaceId ?? '') }),
  });
}
