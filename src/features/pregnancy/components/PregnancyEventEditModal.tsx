import { useEffect, useState } from 'react';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { searchKakaoAddress, searchKakaoPlaces, type KakaoPlaceResult } from '@/shared/lib/kakao/kakaoPlaceSearch';
import { useCreateEvent } from '../hooks/usePregnancyData';
import type { PregnancyEventType } from '../types';
import { EVENT_TYPES } from './PregnancyScheduleView';
import styles from './PregnancyEventEditModal.module.css';

type PlaceSearchMode = 'place' | 'address';

const PLACE_SEARCH_MODES: { key: PlaceSearchMode; label: string; placeholder: string }[] = [
  { key: 'place', label: '장소검색', placeholder: '장소 검색 (예: 분당 맘스요가)' },
  { key: 'address', label: '주소검색', placeholder: '주소 검색 (예: 분당구 정자동 100)' },
];

export interface PregnancyEventEditModalProps {
  onClose: () => void;
}

// 일정 탭 "+ 일정 추가" 팝업 — 결혼(하나가) 챕터의 ScheduleEditModal과 동일 구조(장소검색+지도+주소
// 표시), 체크리스트/상담노트 연결처럼 임신 챕터에 아직 없는 개념은 뺐다.
export function PregnancyEventEditModal({ onClose }: PregnancyEventEditModalProps) {
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<PregnancyEventType>('태교');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [placeSearchMode, setPlaceSearchMode] = useState<PlaceSearchMode>('place');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlaceListOpen, setIsPlaceListOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<KakaoPlaceResult[]>([]);

  useEffect(() => {
    const query = placeName.trim();
    if (!query || placeCoords) {
      setPlaceSuggestions([]);
      return;
    }
    const search = placeSearchMode === 'address' ? searchKakaoAddress : searchKakaoPlaces;
    const timer = setTimeout(() => {
      search(query).then(setPlaceSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [placeName, placeCoords, placeSearchMode]);

  function switchPlaceSearchMode(mode: PlaceSearchMode) {
    setPlaceSearchMode(mode);
    setPlaceName('');
    setPlaceAddress('');
    setPlaceCoords(null);
    setPlaceSuggestions([]);
  }

  function selectPlace(place: KakaoPlaceResult) {
    setPlaceName(place.placeName);
    setPlaceAddress(place.addressName);
    setPlaceCoords({ lat: place.lat, lng: place.lng });
    setIsPlaceListOpen(false);
  }

  function handleSubmit() {
    if (!title.trim() || !placeName.trim()) return;
    createEvent.mutate(
      {
        title: title.trim(),
        eventType,
        scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
        location: placeName.trim(),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.headerTitle}>일정 추가</p>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <label className={styles.label}>제목</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="일정 제목" />

        <label className={styles.label}>일정 유형</label>
        <div className={styles.chipRow}>
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={type === eventType ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => setEventType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>날짜</label>
            <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>시간</label>
            <input type="time" className={styles.input} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <label className={styles.label}>장소</label>
        <div className={styles.placeSearchModes}>
          {PLACE_SEARCH_MODES.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={mode.key === placeSearchMode ? `${styles.placeSearchMode} ${styles.placeSearchModeActive}` : styles.placeSearchMode}
              onClick={() => switchPlaceSearchMode(mode.key)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className={styles.placeSearch}>
          <input
            className={styles.input}
            placeholder={PLACE_SEARCH_MODES.find((mode) => mode.key === placeSearchMode)!.placeholder}
            value={placeName}
            onChange={(event) => {
              setPlaceName(event.target.value);
              setPlaceAddress('');
              setPlaceCoords(null);
              setIsPlaceListOpen(true);
            }}
            onFocus={() => setIsPlaceListOpen(true)}
            onBlur={() => setTimeout(() => setIsPlaceListOpen(false), 100)}
            autoComplete="off"
          />
          {isPlaceListOpen && placeSuggestions.length > 0 && (
            <ul className={styles.placeResults}>
              {placeSuggestions.map((place) => (
                <li key={`${place.placeName}-${place.lat}-${place.lng}`}>
                  <button type="button" className={styles.placeResultItem} onMouseDown={() => selectPlace(place)}>
                    <span className={styles.placeResultName}>📍 {place.placeName}</span>
                    <span className={styles.placeResultAddress}>{place.addressName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {placeAddress && <p className={styles.addressText}>📍 {placeAddress}</p>}
        {placeCoords && (
          <KakaoMap markers={[{ id: 'selected', lat: placeCoords.lat, lng: placeCoords.lng }]} className={styles.mapPreview} />
        )}

        <button type="button" className={styles.submit} onClick={handleSubmit}>
          추가하기
        </button>
      </div>
    </div>
  );
}
