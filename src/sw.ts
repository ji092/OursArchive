/// <reference lib="webworker" />
// vite-plugin-pwa injectManifest 전략용 커스텀 서비스워커. generateSW로는 push 이벤트를 못 넣어서
// (일정 리마인더 OS 푸시, 0016_schedule_ack.sql 참조) injectManifest로 바꿨다. 이 파일은
// tsconfig.json에서 제외돼 있다 — DOM lib(window)와 webworker lib(self)가 타입상 충돌하기 때문.
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const { title, url } = event.data.json() as { title: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
