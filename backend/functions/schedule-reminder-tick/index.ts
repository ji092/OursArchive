// pg_cron이 15분마다 호출 (0016_schedule_ack.sql 하단 주석의 cron.schedule 참조).
// run_schedule_reminders() RPC가 "이번에 보낼 대상"만 원자적으로 골라 티어를 올리고
// notification 행도 만들어준다 — 여기선 그 결과로 실제 web-push만 보낸다.
// 벤더 자격증명(VAPID_PRIVATE_KEY, SUPABASE_SERVICE_ROLE_KEY)은 Edge Function 환경변수로만
// 존재한다 (CLAUDE.md — 벤더 키는 서버측에만).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const DEEP_LINKS: Record<string, string> = {
  love_plan: '/love/calendar',
  wedding_schedule: '/wedding/schedule',
  // 2026-09-03 추가 — 결혼 챕터에서 실제로 쓰는 일정 두 종류.
  consult_note: '/wedding/consult-notes',
  checklist_due: '/wedding/checklist',
  pregnancy_checkup: '/pregnancy/checkup',
  pregnancy_event: '/pregnancy/schedule',
};

interface ReminderRow {
  recipient_user_id: string;
  title: string;
  body?: string | null; // 전날 리마인더(0017)만 채운다 — 확인 독촉(0016)은 제목만.
  source_type: string;
  source_id: string;
}

// 새 API 키 체계의 시크릿 키 접두사. 딕셔너리에 여러 키가 들어 있을 때 이걸 우선 고른다.
const NEW_KEY_PREFIX = 'sb_' + 'secret_';

// 실패가 계속되면 15분마다 알림이 쌓이므로, 같은 장애에 대해서는 이 간격 안에 한 번만 남긴다.
const FAILURE_NOTICE_WINDOW_HOURS = 6;
const FAILURE_SOURCE_TABLE = 'schedule_reminder_tick';

// tick 실패를 Master의 알림 목록에 남긴다. 실패를 알리다가 또 실패할 수 있으므로
// 이 함수 자체는 절대 throw하지 않는다 — 원래 오류 응답을 가리면 안 된다.
async function recordTickFailure(supabase: SupabaseClient, message: string): Promise<void> {
  try {
    const since = new Date(Date.now() - FAILURE_NOTICE_WINDOW_HOURS * 3600_000).toISOString();
    const { data: recent } = await supabase
      .from('notification')
      .select('id')
      .eq('source_table', FAILURE_SOURCE_TABLE)
      .gte('created_at', since)
      .limit(1);
    if (recent && recent.length > 0) return;

    const { data: masters } = await supabase
      .from('membership')
      .select('workspace_id, user_id')
      .eq('role', 'master')
      .eq('status', 'active');
    if (!masters || masters.length === 0) return;

    await supabase.from('notification').insert(
      masters.map((m: { workspace_id: string; user_id: string }) => ({
        workspace_id: m.workspace_id,
        recipient_user_id: m.user_id,
        type: 'system_alert',
        title: '일정 알림 발송이 실패하고 있어요',
        meta: message.slice(0, 500),
        source_table: FAILURE_SOURCE_TABLE,
        source_id: null,
      })),
    );
  } catch (_err) {
    // 알림 남기기까지 실패하면 더 할 수 있는 게 없다. 로그만 남기고 원래 오류를 그대로 반환한다.
    console.error('[tick] 실패 알림을 남기지 못했습니다', _err);
  }
}

// 서버 전용 키를 고른다.
//
// 2026-08-04: 프로젝트가 Supabase의 새 API 키 체계로 넘어가면서 SUPABASE_SERVICE_ROLE_KEY가
// Deprecated로 표시됐고, 그 레거시 JWT로 PostgREST에 붙으면 "JWT issued at future"로 거부된다.
// (재배포 직후 첫 tick인 2026-08-04 11:30부터 모든 호출이 실패했다.)
// 새 체계에서는 sb_secret_... 형식 키를 쓰고 검증은 JWKS 기반으로 바뀐다.
//
// 2026-09-03: 그 뒤로 매 tick이 500 {"error":"Invalid API key"}로 실패하고 있었다(프로덕션
// net._http_response 조회로 확인). 원인은 이 함수가 SUPABASE_SECRET_KEYS의 모양을 잘못 안 것이다 —
// 대시보드 Default secrets 설명대로 이 값은 **JSON 딕셔너리**이지 배열도 쉼표 목록도 아니다.
// 예전 코드는 배열과 쉼표만 다뤄서, 딕셔너리가 오면 split(',')[0]이 중괄호가 붙은 깨진 문자열을
// 그대로 키로 썼다.
//
// 이름이 SUPABASE_로 시작하는 커스텀 시크릿은 대시보드가 거부하므로(예약 접두사), 사람이 다른
// 이름으로 키를 넣어 우회할 수 없다 — 플랫폼이 주입하는 값을 제대로 읽는 것이 유일한 해결책이다.
function pickSecretKey(values: unknown[]): string | null {
  const strings = values.filter((v): v is string => typeof v === 'string' && v.length > 0);
  // 새 체계 키를 우선한다. 못 찾으면 첫 문자열이라도 쓴다(다른 프로젝트/롤백 상황 대비).
  return strings.find((v) => v.startsWith(NEW_KEY_PREFIX)) ?? strings[0] ?? null;
}

function resolveServiceKey(): string {
  const raw =
    Deno.env.get('SUPABASE_SECRET_KEYS') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!raw) throw new Error('서버 전용 키가 환경변수에 없습니다');

  const trimmed = raw.trim();

  // 지금 플랫폼이 주입하는 모양: 이름 → 키 문자열의 딕셔너리.
  if (trimmed.startsWith('{')) {
    const dict = JSON.parse(trimmed) as Record<string, unknown>;
    const direct = pickSecretKey(Object.values(dict));
    if (direct) return direct;
    // 한 단계 중첩된 모양도 대비한다.
    const nested = Object.values(dict).flatMap((v) => (v && typeof v === 'object' ? Object.values(v as object) : []));
    const fromNested = pickSecretKey(nested);
    if (fromNested) return fromNested;
    throw new Error('SUPABASE_SECRET_KEYS 딕셔너리에서 키를 찾지 못했습니다');
  }

  if (trimmed.startsWith('[')) {
    const key = pickSecretKey(JSON.parse(trimmed) as unknown[]);
    if (key) return key;
    throw new Error('SUPABASE_SECRET_KEYS 목록이 비어 있습니다');
  }

  // 쉼표로 나열된 형태도 대비한다. 단일 값이면 split 결과가 그대로 하나다.
  const key = pickSecretKey(trimmed.split(',').map((v) => v.trim()));
  if (!key) throw new Error('서버 전용 키를 해석하지 못했습니다');
  return key;
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('SCHEDULE_REMINDER_SECRET')}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, resolveServiceKey());

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@ours-archive.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  // 두 종류의 리마인더를 같은 tick에서 처리한다.
  //   run_schedule_reminders()  = 확인(댓글) 안 하면 조르는 에스컬레이션 (0016)
  //   run_schedule_day_before() = 일정 전날 14:00 KST 공지 1회 (0017)
  const [escalation, dayBefore] = await Promise.all([
    supabase.rpc('run_schedule_reminders'),
    supabase.rpc('run_schedule_day_before'),
  ]);
  const error = escalation.error ?? dayBefore.error;
  if (error) {
    // 여기서 그냥 500을 반환하면 아무 흔적이 남지 않는다. pg_cron은 실패한 http_post를
    // 조용히 넘기고 다음 15분에 다시 부르기 때문에, 함수가 계속 죽어도 "알림이 안 오네"를
    // 사람이 눈치챌 때까지 아무도 모른다 (2026-08-01 ambiguous column 오류로 5회 연속
    // 500이 났을 때 실제로 그랬다).
    // Master 앞으로 알림 행을 남겨 앱에서 보이게 한다. 푸시까지 보내지 않는 이유는,
    // 실패가 반복되면 15분마다 푸시가 울려 그 자체가 문제가 되기 때문이다.
    await recordTickFailure(supabase, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows = [
    ...((escalation.data ?? []) as ReminderRow[]),
    ...((dayBefore.data ?? []) as ReminderRow[]),
  ];
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
    const payload = JSON.stringify({
      title: row.title,
      body: row.body ?? undefined,
      url: DEEP_LINKS[row.source_type] ?? '/',
    });

    for (const sub of recipientSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          // urgency high: 안드로이드 Doze/절전 상태에서도 서비스워커를 깨우도록 요청한다.
          // 기본값(normal)이면 브라우저가 잠들어 있을 때 FCM이 붙들고 있다가 나중에 몰아서 준다
          // (2026-08-01 실기기 테스트에서 실제로 그렇게 밀렸음).
          //
          // TTL 12시간: 라이브러리 기본값이 4주라, 폰이 오래 꺼져 있으면 며칠 지난 리마인더가
          // 뒤늦게 뜬다. 전날 14:00 공지는 그날 자정까지만 의미가 있고, 확인 독촉은 어차피
          // 다음 티어가 덮어쓰므로 12시간이면 충분하다.
          { urgency: 'high', TTL: 43200 },
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
