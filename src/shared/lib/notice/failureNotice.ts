// 화면을 떠난 뒤에 도착하는 실패를 사용자에게 알리기 위한 최소한의 통지 채널.
//
// 배경: 일정 등록 후 확인 리마인더(schedule_ack) 생성은 일부러 일정 저장과 분리돼 있다.
// ack가 실패해도 일정 자체는 이미 저장됐으므로 롤백하지 않는다(scheduleAckApi.ts 참조).
// 다만 지금까지는 그 실패를 빈 catch로 삼켜서, 리마인더가 안 걸린 사실을 아무도 몰랐다.
// (CLAUDE.md — 실패했을 때 무엇이 남고 누가 알게 되는지까지 설계에 포함한다)
//
// 컴포넌트 state를 쓸 수 없는 이유: 호출부 4곳 중 3곳이 ack 호출 직후 모달을 닫거나
// 다른 라우트로 이동한다. 그 컴포넌트에 토스트를 두면 언마운트돼서 표시되지 않는다.
// 그래서 앱 루트(AppLayout)에 하나만 두고 모듈 수준에서 호출한다.

type Listener = (message: string) => void;

const listeners = new Set<Listener>();

export function subscribeFailureNotice(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 사용자에게 실패를 알린다. 되돌릴 수 없는 부분 실패(이미 저장된 것은 남고 일부만 실패)에 쓴다.
 * cause는 화면에 노출하지 않고 콘솔에만 남긴다 — 원인 추적용이며 사용자에겐 의미가 없다.
 */
export function reportFailure(message: string, cause?: unknown): void {
  // 리스너가 없을 수도 있으므로(루트 마운트 전) 콘솔 기록은 항상 먼저 남긴다.
  console.error('[failure]', message, cause);
  for (const listener of listeners) listener(message);
}
