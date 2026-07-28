import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import {
  addDiaryComment,
  createDiary,
  createEvent,
  createExpense,
  deleteDiaryComment,
  deleteExpense,
  fetchCheckups,
  fetchDiaries,
  fetchEvents,
  fetchExpenses,
  fetchWeekContent,
} from '../api';

export const diariesQueryKey = ['pregnancy-diaries'] as const;
export const checkupsQueryKey = ['pregnancy-checkups'] as const;
export const eventsQueryKey = ['pregnancy-events'] as const;
export const expensesQueryKey = ['pregnancy-expenses'] as const;

// 출산 예정일은 관리 페이지(admin)에서 입력하는 workspace.due_date를 그대로 쓴다 (shared로 승격,
// 2026-07-23).
export function useDueDate() {
  const { data, ...rest } = useWorkspaceSettings();
  return { ...rest, data: data?.dueDate };
}

export function useDiaries() {
  return useQuery({ queryKey: diariesQueryKey, queryFn: fetchDiaries });
}

export function useCreateDiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDiary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diariesQueryKey }),
  });
}

export function useAddDiaryComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addDiaryComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diariesQueryKey }),
  });
}

export function useDeleteDiaryComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDiaryComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diariesQueryKey }),
  });
}

export function useCheckups() {
  return useQuery({ queryKey: checkupsQueryKey, queryFn: fetchCheckups });
}

export function useWeekContent(weekNo: number) {
  return useQuery({ queryKey: ['pregnancy-week-content', weekNo], queryFn: () => fetchWeekContent(weekNo) });
}

export function useEvents() {
  return useQuery({ queryKey: eventsQueryKey, queryFn: fetchEvents });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsQueryKey }),
  });
}

export function useExpenses() {
  return useQuery({ queryKey: expensesQueryKey, queryFn: fetchExpenses });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesQueryKey }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesQueryKey }),
  });
}
