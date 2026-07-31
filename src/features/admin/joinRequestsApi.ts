import { supabase } from '@/shared/lib/api/supabaseClient';
import type { MemberRole } from './types';

export interface JoinRequest {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  joinMessage: string | null;
  requestedAt: string;
}

export async function fetchJoinRequests(): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('membership')
    .select('id, user_id, join_message, created_at, profiles!membership_user_id_fkey(name, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      name: profile?.name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      joinMessage: row.join_message,
      requestedAt: row.created_at,
    };
  });
}

export async function approveJoinRequest(id: string, role: Exclude<MemberRole, 'master'>): Promise<void> {
  const { error } = await supabase.from('membership').update({ role, status: 'active' }).eq('id', id);
  if (error) throw error;
}

export async function rejectJoinRequest(id: string): Promise<void> {
  const { error } = await supabase.from('membership').delete().eq('id', id);
  if (error) throw error;
}
