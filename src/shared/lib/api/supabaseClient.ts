import { createClient } from '@supabase/supabase-js';

// anon key는 RLS로 접근이 제한되므로 클라이언트에 노출돼도 안전하다 (PHASE6/CLAUDE.md 보안 규칙).
// service role key 등 서버 전용 키는 이 파일에도, 어떤 프론트 코드에도 절대 들어오지 않는다.

// CLAUDE.md — 외부 API 호출에는 타임아웃·재시도·폴백을 전부 명시한다.
// 세 가지를 각각 다른 층에서 담당한다:
//   타임아웃 = 여기(모든 Supabase 요청에 일괄 적용)
//   재시도   = src/app/providers.tsx 의 QueryClient 기본값
//   폴백     = 각 화면의 error 상태 처리(사용자에게 실패를 알린다)
// 개별 호출부에 흩어놓지 않는 이유는, 26개 호출 중 하나라도 빠뜨리면 그 경로만 조용히
// 무한 대기가 되기 때문이다.
const REQUEST_TIMEOUT_MS = 10_000;

// AbortSignal.any()는 iOS Safari 17.4 미만에서 없다. 가족 단말을 특정할 수 없으므로
// 컨트롤러를 직접 합쳐서 구형 웹뷰에서도 동작하게 한다.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`요청이 ${REQUEST_TIMEOUT_MS}ms 안에 끝나지 않았습니다`, 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  );

  // 호출자가 넘긴 signal(react-query의 쿼리 취소)도 그대로 존중한다.
  const external = init?.signal;
  const forwardAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', forwardAbort, { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    external?.removeEventListener('abort', forwardAbort);
  });
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { global: { fetch: fetchWithTimeout } },
);
