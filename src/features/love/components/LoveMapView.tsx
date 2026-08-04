import { useMemo, useState } from 'react';
import { IconPin } from '@/shared/components/ui/icons';
import { useSearchParams } from 'react-router-dom';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { RecordThumbnail } from '@/shared/components/record/RecordThumbnail';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useLoveRecords } from '../hooks/useLoveRecords';
import { LoveRecordDetailModalController } from './LoveRecordDetailModalController';
import styles from './LoveMapView.module.css';

// 요구사항 3.2.4 지도 뷰 — 카카오맵 JS SDK로 실제 지도에 핀을 찍는다(VITE_KAKAO_JS_KEY 필요).
// 지역별 클러스터 리스트는 아직 장소명 키워드로 대략 묶는다 — 실제 행정구역 역지오코딩은 이후 연결.
export function LoveMapView() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const { data: records } = useLoveRecords(membership?.workspaceId);
  const [, setSearchParams] = useSearchParams();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const clusters = useMemo(() => {
    const map = new Map<string, typeof records>();
    for (const record of records ?? []) {
      const region = regionOf(record.placeName);
      const bucket = map.get(region) ?? [];
      bucket.push(record);
      map.set(region, bucket as NonNullable<typeof records>);
    }
    return Array.from(map.entries()).sort((a, b) => b[1]!.length - a[1]!.length);
  }, [records]);

  const visibleRecords = selectedRegion
    ? (clusters.find(([region]) => region === selectedRegion)?.[1] ?? [])
    : (records ?? []);

  const markers = useMemo(
    () =>
      visibleRecords
        .filter((record): record is NonNullable<typeof records>[number] & { lat: number; lng: number } => !!record.lat && !!record.lng)
        .map((record) => ({
          id: record.id,
          lat: record.lat,
          lng: record.lng,
          onClick: () => setSearchParams({ record: record.id }),
        })),
    [visibleRecords, setSearchParams],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.clusterList}>
        <p className={styles.clusterListTitle}>지역별 추억</p>
        {clusters.map(([region, regionRecords]) => (
          <button
            key={region}
            type="button"
            className={region === selectedRegion ? `${styles.clusterItem} ${styles.clusterItemActive}` : styles.clusterItem}
            onClick={() => setSelectedRegion(region === selectedRegion ? null : region)}
          >
            <span className={styles.clusterCount}>{regionRecords!.length}</span>
            <span>
              <span className={styles.clusterRegion}>{region}</span>
              <span className={styles.clusterSample}>{regionRecords![0].placeName} 외 {regionRecords!.length - 1}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.mapArea}>
        <KakaoMap markers={markers} className={styles.map} />

        <div className={styles.placeCards}>
          {visibleRecords.map((record) => (
            <button key={record.id} type="button" className={styles.placeCard} onClick={() => setSearchParams({ record: record.id })}>
              <RecordThumbnail
                gradient={record.photos[0]?.gradient}
                imageUrl={record.photos[0]?.imageUrl}
                alt={`${record.placeName} 사진`}
                className={styles.placeThumb}
              />
              <span className={styles.placeInfo}>
                <span className={styles.placeBody}>{record.body}</span>
                <span className={styles.placeName}><IconPin /> {record.placeName}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <LoveRecordDetailModalController />
    </div>
  );
}

// 좌표→행정구역 변환(NCP Geocoding)을 붙이기 전까지는 장소명 키워드로 대략 묶는다.
function regionOf(placeName: string): string {
  if (placeName.includes('제주') || placeName.includes('함덕') || placeName.includes('애월')) return '제주도';
  return '서울·수도권';
}
