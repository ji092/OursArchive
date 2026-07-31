import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '@/shared/lib/kakao/loadKakaoMaps';
import styles from './KakaoMap.module.css';

interface KakaoMapMarker {
  id: string;
  lat: number;
  lng: number;
  onClick?: () => void;
}

interface KakaoMapProps {
  markers: KakaoMapMarker[];
  className?: string;
}

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
// PWA 설치 직후 첫 실행처럼 네트워크가 아직 불안정한 타이밍에 로딩이 실패하면, 사용자에게 에러부터
// 보여주기 전에 한 번은 조용히 재시도한다 (지난 세션에 보고된 "설치 직후엔 안 뜨고 잠시 후엔 뜬다" 증상 대응).
const AUTO_RETRY_DELAY_MS = 1500;

export function KakaoMap({ markers, className }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const hasAutoRetried = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let markerInstances: any[] = [];

    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = window.kakao;
        const center = markers[0] ?? SEOUL_CITY_HALL;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 7,
        });

        // 컨테이너가 아직 레이아웃/폰트 확정 전(0 높이 등)에 지도가 만들어졌을 수 있어 다음 페인트
        // 이후 한 번 relayout + 중심을 다시 맞춰준다 — 그렇지 않으면 타일이 잘못된 위치에 걸린 채로 굳는다.
        requestAnimationFrame(() => {
          if (cancelled) return;
          map.relayout();
          map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
        });

        markerInstances = markers.map((marker) => {
          const instance = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(marker.lat, marker.lng),
            map,
          });
          if (marker.onClick) kakao.maps.event.addListener(instance, 'click', marker.onClick);
          return instance;
        });

        if (markers.length > 1) {
          const bounds = new kakao.maps.LatLngBounds();
          markers.forEach((marker) => bounds.extend(new kakao.maps.LatLng(marker.lat, marker.lng)));
          map.setBounds(bounds);
        }

        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (!hasAutoRetried.current) {
          hasAutoRetried.current = true;
          setTimeout(() => {
            if (!cancelled) setRetryToken((token) => token + 1);
          }, AUTO_RETRY_DELAY_MS);
          return;
        }
        setError(err.message);
      });

    return () => {
      cancelled = true;
      markerInstances.forEach((instance) => instance.setMap(null));
    };
  }, [markers, retryToken]);

  if (error) {
    return (
      <div className={[styles.fallback, className].filter(Boolean).join(' ')}>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            hasAutoRetried.current = false;
            setError(null);
            setRetryToken((token) => token + 1);
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
