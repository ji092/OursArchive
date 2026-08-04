import { supabase } from '@/shared/lib/api/supabaseClient';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

// 옵트인 진입점(MyPageView.tsx "일정 알림 받기" 토글)에서만 호출한다 — 브라우저가 사용자
// 제스처 없이는 알림 권한 팝업을 안 띄운다. VAPID 공개키는 안전하게 클라이언트에 노출 가능
// (CLAUDE.md 네이버맵 JS 키와 같은 예외 범주 — 비밀키가 아님).
export async function registerPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await supabase
    .from('push_subscription')
    .upsert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
  return true;
}

/**
 * 브라우저 구독과 DB의 push_subscription 행을 맞춘다. 앱 진입 시 1회 호출한다.
 *
 * 필요한 이유: 두 곳이 어긋나도 화면상 아무 표시가 없다.
 * - Edge Function이 404/410 응답을 받으면 DB 행을 지운다(schedule-reminder-tick). 그런데
 *   브라우저에는 구독이 그대로 남아 있어 마이페이지 토글은 계속 "켜짐"으로 보인다.
 *   그 상태에서는 푸시가 영영 안 오는데 사용자는 켜져 있다고 믿는다.
 * - 브라우저가 구독을 회전시키면 DB에 옛 endpoint만 남는다.
 *
 * 권한을 요청하지 않는다 — 사용자 제스처 없이는 팝업이 뜨지 않고, 여기서 요청하면
 * 앱을 열 때마다 권한을 조르는 꼴이 된다. 이미 허용해둔 사용자만 대상으로 한다.
 * 실패해도 조용히 넘어간다. 이건 보정 작업이라 앱 진입을 막을 이유가 없다.
 */
export async function syncPushSubscription(userId: string): Promise<void> {
  try {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    // endpoint 기준 upsert라 이미 있으면 그대로고, 지워졌으면 되살아난다.
    await supabase
      .from('push_subscription')
      .upsert(
        { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'endpoint' },
      );
  } catch {
    // 무시한다 — 다음 진입에서 다시 시도된다.
  }
}

export async function unregisterPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from('push_subscription').delete().eq('endpoint', endpoint);
}
