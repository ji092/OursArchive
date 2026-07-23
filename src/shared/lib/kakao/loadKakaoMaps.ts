// 카카오맵 JS SDK를 <script> 태그로 동적 로드한다. 여러 지도 컴포넌트가 동시에 마운트돼도
// 스크립트가 중복 삽입되지 않도록 모듈 스코프에 로딩 프로미스를 캐싱한다.
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

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services,clusterer`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오맵 SDK를 불러오지 못했어요.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
