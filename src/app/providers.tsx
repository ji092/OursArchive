import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { reportFailure } from '@/shared/lib/notice/failureNotice';

// 재시도해도 결과가 같은 오류는 재시도하지 않는다. RLS 거부(401/403), 검증 실패(400),
// 없는 리소스(404)가 여기 해당한다 — 같은 요청을 두 번 더 보내도 같은 응답이 온다.
function isRetriableError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === 'number') return status >= 500 || status === 429;
  // status가 없는 경우는 네트워크 단절·타임아웃이라 재시도 가치가 있다.
  return true;
}

// 서버 상태(love_record, prep_item 등)는 이 캐시 하나만 진실로 삼는다 (PHASE5 1장, CLAUDE.md).
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // 쓰기 실패를 화면에 알리는 마지막 그물. 지금까지 onError 핸들러가 한 곳도 없어서,
        // 등록이 실패해도 폼이 그대로 멈춰 있었고 사용자가 다시 눌러 중복 등록이 됐다.
        // 개별 화면에서 이미 오류를 표시하는 경우(LoginPage 등)는 meta.silentError로 끈다.
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if (mutation.meta?.silentError) return;
            reportFailure('저장하지 못했어요. 잠시 후 다시 시도해주세요.', error);
          },
        }),
        defaultOptions: {
          queries: {
            // 읽기는 최대 2회 더 시도한다(총 3회). 1초 → 2초 → 4초 백오프.
            retry: (failureCount, error) => failureCount < 2 && isRetriableError(error),
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            staleTime: 30_000,
          },
          mutations: {
            // 쓰기는 재시도하지 않는다. 요청이 서버에 닿은 뒤 응답만 유실된 경우를 구분할 수
            // 없어서, 재시도가 그대로 중복 삽입이 된다 (CLAUDE.md — 재시도 시 중복 실행).
            // 실패는 위 mutationCache가 사용자에게 알리고, 다시 누르게 하는 쪽이 안전하다.
            retry: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
