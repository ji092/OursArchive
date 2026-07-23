// PHASE7 착수 스캐폴딩용 임시 컴포넌트 — 실제 기능은 MVP 우선순위(PHASE1 3장)에 따라 하나씩 대체한다.
// 페이지마다 중복 보일러플레이트를 만들지 않기 위해 이 하나만 공유한다.
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>{title}</h1>
      <p>구현 예정 (MVP 우선순위는 docs/PHASE1_plan.md 3장 참조)</p>
    </div>
  );
}
