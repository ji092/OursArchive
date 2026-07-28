import { useEffect, useState } from 'react';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { searchKakaoAddress, searchKakaoPlaces, type KakaoPlaceResult } from '@/shared/lib/kakao/kakaoPlaceSearch';
import { useConsultNotes, useCreatePrepItem, usePrepItems, useUpdatePrepItem } from '../hooks/useWeddingData';
import type { WeddingEventType } from '../types';
import { EVENT_TYPES, eventTypeLabel } from './WeddingScheduleView';
import styles from './ScheduleEditModal.module.css';

type PlaceSearchMode = 'place' | 'address';

const PLACE_SEARCH_MODES: { key: PlaceSearchMode; label: string; placeholder: string }[] = [
  { key: 'place', label: '장소검색', placeholder: '장소 검색 (예: 논현 W웨딩홀)' },
  { key: 'address', label: '주소검색', placeholder: '주소 검색 (예: 강남구 논현동 200)' },
];

export interface ScheduleEditModalProps {
  onClose: () => void;
}

// 일정 탭 "+ 일정 추가" 팝업 — 체크리스트 항목과 연결(선택)/상담노트 다중 연결/장소 검색+지도+주소 표시를
// 함께 처리한다. 다른 챕터에 재사용하지 않는다.
export function ScheduleEditModal({ onClose }: ScheduleEditModalProps) {
  const { data: items } = usePrepItems();
  const { data: consultNotes } = useConsultNotes();
  const createItem = useCreatePrepItem();
  const updateItem = useUpdatePrepItem();

  const linkableItems = (items ?? []).filter((item) => item.checklist && !item.schedule);

  const [linkedItemId, setLinkedItemId] = useState('');
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<WeddingEventType>('상담');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [placeSearchMode, setPlaceSearchMode] = useState<PlaceSearchMode>('place');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlaceListOpen, setIsPlaceListOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<KakaoPlaceResult[]>([]);
  const [consultNoteIds, setConsultNoteIds] = useState<string[]>([]);

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

  function toggleConsultNote(id: string) {
    setConsultNoteIds((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  }

  function handleLinkChange(id: string) {
    setLinkedItemId(id);
    const item = linkableItems.find((i) => i.id === id);
    if (item) {
      setTitle(item.title);
      setConsultNoteIds(item.consultNoteIds);
    }
  }

  function handleSubmit() {
    if (!title.trim() || !placeName.trim()) return;
    const schedule = { scheduledAt: new Date(`${date}T${time}:00`).toISOString(), location: placeName.trim(), eventType };
    if (linkedItemId) {
      updateItem.mutate({ id: linkedItemId, patch: { schedule, consultNoteIds } }, { onSuccess: onClose });
      return;
    }
    createItem.mutate(
      { title: title.trim(), category: '기타', assigneeName: null, schedule, consultNoteIds },
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

        {linkableItems.length > 0 && (
          <>
            <label className={styles.label}>체크리스트 항목과 연결 (선택)</label>
            <select className={styles.input} value={linkedItemId} onChange={(e) => handleLinkChange(e.target.value)}>
              <option value="">새 일정으로 추가</option>
              {linkableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <p className={styles.hint}>선택하면 그 체크리스트 항목에 일정이 연결돼요.</p>
          </>
        )}

        <label className={styles.label}>제목</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!!linkedItemId}
          placeholder="일정 제목"
        />

        <label className={styles.label}>일정 유형</label>
        <div className={styles.chipRow}>
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={type === eventType ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => setEventType(type)}
            >
              {eventTypeLabel(type)}
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

        <label className={styles.label}>연결된 상담노트 (선택)</label>
        <div className={styles.noteList}>
          {(consultNotes ?? []).map((note) => (
            <label key={note.id} className={styles.noteCheck}>
              <input type="checkbox" checked={consultNoteIds.includes(note.id)} onChange={() => toggleConsultNote(note.id)} />
              {note.vendorName} ({note.vendorType})
            </label>
          ))}
          {(consultNotes ?? []).length === 0 && <p className={styles.hint}>등록된 상담노트가 없어요.</p>}
        </div>

        <button type="button" className={styles.submit} onClick={handleSubmit}>
          추가하기
        </button>
      </div>
    </div>
  );
}
