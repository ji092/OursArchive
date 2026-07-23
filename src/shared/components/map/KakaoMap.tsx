import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '@/shared/lib/kakao/loadKakaoMaps';
import styles from './KakaoMap.module.css';

export interface KakaoMapMarker {
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

export function KakaoMap({ markers, className }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      markerInstances.forEach((instance) => instance.setMap(null));
    };
  }, [markers]);

  if (error) {
    return <div className={[styles.fallback, className].filter(Boolean).join(' ')}>{error}</div>;
  }

  return <div ref={containerRef} className={className} />;
}
