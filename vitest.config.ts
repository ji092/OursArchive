import { defineConfig } from 'vitest/config';

// 순수 계산 함수와 권한 판정만 테스트한다 — DOM/브라우저 API, 네트워크 접근이 필요 없다.
// jsdom 등 렌더링 환경을 붙이지 않는 이유도 이것뿐이다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
