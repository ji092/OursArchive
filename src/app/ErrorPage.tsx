import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

// react-router 기본 에러 화면("Unexpected Application Error! 404 Not Found")은 렌더링 중 발생한
// 일반 JS 에러도 404처럼 보이게 표시해 혼란을 준다 — 실제 에러 메시지와 새로고침 동선을 보여준다.
export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '알 수 없는 오류가 발생했어요.';

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: '#6b7684', letterSpacing: '0.1em' }}>ERROR</p>
      <h1 style={{ fontSize: 20, fontWeight: 400, margin: '8px 0 12px' }}>문제가 발생했어요</h1>
      <p style={{ fontSize: 13, color: '#6b7684', marginBottom: 24, wordBreak: 'break-word' }}>{message}</p>
      <button
        type="button"
        onClick={() => window.location.assign('/')}
        style={{
          padding: '10px 20px',
          borderRadius: 999,
          border: 'none',
          background: '#14181c',
          color: '#fff',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        메인으로 돌아가기
      </button>
    </div>
  );
}
