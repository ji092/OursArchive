import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PHASE6/PHASE7: registerType 'prompt' — 새 버전이 있으면 사용자에게 확인 후 새로고침
// (가족 구성원이 쓰는 앱이라 예고 없이 화면이 바뀌는 걸 피하기 위한 선택, PHASE 배포 논의 반영)
// strategies: injectManifest — 일정 리마인더 OS 푸시(0016_schedule_ack.sql) 때문에 커스텀
// push/notificationclick 핸들러(src/sw.ts)가 필요해서 generateSW에서 전환했다.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
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
