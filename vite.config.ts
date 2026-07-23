import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PHASE6/PHASE7: registerType 'prompt' — 새 버전이 있으면 사용자에게 확인 후 새로고침
// (가족 구성원이 쓰는 앱이라 예고 없이 화면이 바뀌는 걸 피하기 위한 선택, PHASE 배포 논의 반영)
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
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
      workbox: {
        // 정적 자원 Cache First, API 데이터는 각 쿼리 훅에서 React Query가 담당(요구사항 8장)
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
