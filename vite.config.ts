import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// registerType 'autoUpdate' — 새 버전을 감지하면 자동으로 적용한다 (2026-07-31 변경).
// 원래는 'prompt'였지만 확인 팝업 UI(useRegisterSW/onNeedRefresh)가 실제로 구현된 적이 없어서,
// 새 서비스워커가 waiting에 머물다 앱을 완전히 종료해야만 반영되는 상태였다. 팝업을 새로 만드는
// 대신 자동 적용으로 정리했다 — 짝이 되는 skipWaiting/clients.claim은 src/sw.ts에 있다.
// strategies: injectManifest — 일정 리마인더 OS 푸시(0016_schedule_ack.sql) 때문에 커스텀
// push/notificationclick 핸들러(src/sw.ts)가 필요해서 generateSW에서 전환했다.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Ours Archive',
        short_name: 'Our Archive',
        description: '우리 둘의 모든 순간을, 한 페이지에 담아요.',
        theme_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
