// pg_cron이 15분마다 호출 (0016_schedule_ack.sql 하단 주석의 cron.schedule 참조).
// run_schedule_reminders() RPC가 "이번에 보낼 대상"만 원자적으로 골라 티어를 올리고
// notification 행도 만들어준다 — 여기선 그 결과로 실제 web-push만 보낸다.
// 벤더 자격증명(VAPID_PRIVATE_KEY, SUPABASE_SERVICE_ROLE_KEY)은 Edge Function 환경변수로만
// 존재한다 (CLAUDE.md — 벤더 키는 서버측에만).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const DEEP_LINKS: Record<string, string> = {
  love_plan: '/love/calendar',
  wedding_schedule: '/wedding/schedule',
  pregnancy_checkup: '/pregnancy/checkup',
  pregnancy_event: '/pregnancy/schedule',
};

interface ReminderRow {
  recipient_user_id: string;
  title: string;
  source_type: string;
  source_id: string;
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('SCHEDULE_REMINDER_SECRET')}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@ours-archive.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const { data: reminders, error } = await supabase.rpc('run_schedule_reminders');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const rows = (reminders ?? []) as ReminderRow[];
  if (rows.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const userIds = Array.from(new Set(rows.map((r) => r.recipient_user_id)));
  const { data: subs, error: subError } = await supabase
    .from('push_subscription')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (subError) return new Response(JSON.stringify({ error: subError.message }), { status: 500 });

  let sent = 0;
  const staleIds: string[] = [];

  for (const row of rows) {
    const recipientSubs = (subs ?? []).filter((s) => s.user_id === row.recipient_user_id);
    const payload = JSON.stringify({ title: row.title, url: DEEP_LINKS[row.source_type] ?? '/' });

    for (const sub of recipientSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleIds.push(sub.id);
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from('push_subscription').delete().in('id', staleIds);
  }

  return new Response(JSON.stringify({ sent, staleRemoved: staleIds.length }), { status: 200 });
});
