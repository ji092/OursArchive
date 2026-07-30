// 카카오맵 JS SDK를 <script> 태그로 동적 로드한다. 여러 지도 컴포넌트가 동시에 마운트돼도
// 스크립트가 중복 삽입되지 않도록 모듈 스코프에 로딩 프로미스를 캐싱한다.
// PWA 설치 직후 첫 실행처럼 네트워크가 아직 불안정한 타이밍에는 외부 스크립트 로드가 조용히
// 멈춰버릴 수 있어(onload/onerror 둘 다 안 옴) 타임아웃을 둬서 실패로 확정하고 재시도가 가능하게 한다.
const LOAD_TIMEOUT_MS = 8000;

let loadPromise: Promise<void> | null = null;

export function loadKakaoMaps(): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const appKey = import.meta.env.VITE_KAKAO_JS_KEY;
    if (!appKey) {
      loadPromise = null;
      reject(new Error('카카오맵 API 키(VITE_KAKAO_JS_KEY)가 설정되지 않았어요.'));
      return;
    }

    const timer = setTimeout(() => {
      loadPromise = null;
      reject(new Error('카카오맵 SDK 로딩이 지연되고 있어요. 네트워크 연결을 확인하고 다시 시도해주세요.'));
    }, LOAD_TIMEOUT_MS);

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services,clusterer`;
    script.onload = () =>
      window.kakao.maps.load(() => {
        clearTimeout(timer);
        resolve();
      });
    script.onerror = () => {
      clearTimeout(timer);
      loadPromise = null;
      script.remove();
      reject(new Error('카카오맵 SDK를 불러오지 못했어요.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
