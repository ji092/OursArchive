import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { IconPin } from '@/shared/components/ui/icons';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { searchKakaoAddress, searchKakaoPlaces, type KakaoPlaceResult } from '@/shared/lib/kakao/kakaoPlaceSearch';
import { useWeddingActionsHost } from '../actionsPortal';
import { useCreateConsultNote, useConsultNotes, useUpdateConsultNote } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import type { ConsultNote, WeddingCategory } from '../types';
import { WEDDING_CATEGORIES } from '../types';
import styles from './WeddingConsultNotesView.module.css';

const MAX_PHOTOS = 6;
type PlaceSearchMode = 'place' | 'address';

const PLACE_SEARCH_MODES: { key: PlaceSearchMode; label: string; placeholder: string }[] = [
  { key: 'place', label: '장소검색', placeholder: '장소 검색 (예: 논현 W웨딩홀)' },
  { key: 'address', label: '주소검색', placeholder: '주소 검색 (예: 강남구 논현동 200)' },
];

export function WeddingConsultNotesView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: notes } = useConsultNotes(workspaceId);
  const createNote = useCreateConsultNote(workspaceId);
  const updateNote = useUpdateConsultNote(workspaceId);
  const actionsHost = useWeddingActionsHost();
  const [editingNote, setEditingNote] = useState<ConsultNote | 'new' | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState<WeddingCategory>('웨딩홀');
  const [contactPhone, setContactPhone] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ConsultNote['status']>('scheduled');
  const [keyMemos, setKeyMemos] = useState('');
  const [questions, setQuestions] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<ConsultNote['photos']>([]);
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [placeSearchMode, setPlaceSearchMode] = useState<PlaceSearchMode>('place');
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlaceListOpen, setIsPlaceListOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<KakaoPlaceResult[]>([]);
  // 달력(연애/결혼/임신)에서 상담 일정을 누르면 ?note=<id>로 들어온다 — 해당 노트를 바로 연다.
  // 모달은 라우트가 아니라 쿼리 파라미터로 연다는 규칙(CLAUDE.md)을 그대로 따른다.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedNoteId = searchParams.get('note');
  const openedNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedNoteId) {
      openedNoteIdRef.current = null;
      return;
    }
    if (openedNoteIdRef.current === requestedNoteId) return;
    const target = (notes ?? []).find((note) => note.id === requestedNoteId);
    if (!target) return; // 아직 로딩 중이거나 접근 권한이 없는 노트 — 목록만 보여준다
    openedNoteIdRef.current = requestedNoteId;
    openEdit(target);
  }, [requestedNoteId, notes]);

  useEffect(() => {
    const query = placeName.trim();
    if (!query || coords) {
      setPlaceSuggestions([]);
      return;
    }
    const search = placeSearchMode === 'address' ? searchKakaoAddress : searchKakaoPlaces;
    const timer = setTimeout(() => {
      search(query).then(setPlaceSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [placeName, coords, placeSearchMode]);

  function switchPlaceSearchMode(mode: PlaceSearchMode) {
    setPlaceSearchMode(mode);
    setPlaceName('');
    setAddress('');
    setCoords(null);
    setPlaceSuggestions([]);
  }

  function selectPlace(place: KakaoPlaceResult) {
    setPlaceName(place.placeName);
    setAddress(place.addressName);
    setCoords({ lat: place.lat, lng: place.lng });
    setIsPlaceListOpen(false);
  }

  function openNew() {
    setVendorName('');
    setVendorType('웨딩홀');
    setContactPhone('');
    setVisitDate(new Date().toISOString().slice(0, 10));
    setStatus('scheduled');
    setKeyMemos('');
    setQuestions('');
    setExistingPhotos([]);
    setRemovedPhotoPaths([]);
    setNewPhotos([]);
    setPlaceName('');
    setAddress('');
    setCoords(null);
    setEditingNote('new');
  }

  function openEdit(note: ConsultNote) {
    setVendorName(note.vendorName);
    setVendorType(note.vendorType);
    setContactPhone(note.contactPhone);
    setVisitDate(note.visitDate);
    setStatus(note.status);
    setKeyMemos(note.keyMemos.join('\n'));
    setQuestions(note.questions.join('\n'));
    setExistingPhotos(note.photos);
    setRemovedPhotoPaths([]);
    setNewPhotos([]);
    setPlaceName(note.vendorName);
    setAddress(note.address);
    setCoords(note.lat !== null && note.lng !== null ? { lat: note.lat, lng: note.lng } : null);
    setEditingNote(note);
  }

  function closeForm() {
    setEditingNote(null);
    newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    if (searchParams.has('note')) {
      const next = new URLSearchParams(searchParams);
      next.delete('note');
      setSearchParams(next, { replace: true });
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const room = MAX_PHOTOS - existingPhotos.length - newPhotos.length;
    const accepted = files.slice(0, Math.max(0, room)).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...accepted]);
    event.target.value = '';
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => {
      const removed = prev[index];
      if (removed) setRemovedPhotoPaths((paths) => [...paths, removed.path]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit() {
    if (!vendorName.trim() || !workspaceId) return;
    const fields = {
      vendorName: vendorName.trim(),
      vendorType,
      contactPhone: contactPhone.trim(),
      visitDate,
      status,
      keyMemos: keyMemos.split('\n').map((line) => line.trim()).filter(Boolean),
      questions: questions.split('\n').map((line) => line.trim()).filter(Boolean),
      address,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
    if (editingNote === 'new') {
      createNote.mutate(
        { workspaceId, ...fields, photoFiles: newPhotos.map((p) => p.file) },
        { onSuccess: closeForm },
      );
      return;
    }
    if (editingNote) {
      updateNote.mutate(
        {
          id: editingNote.id,
          workspaceId,
          patch: fields,
          removedPhotoPaths,
          newPhotoFiles: newPhotos.map((p) => p.file),
        },
        { onSuccess: closeForm },
      );
    }
  }

  return (
    <div className={styles.wrap}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={openNew}>
            + 노트 추가
          </button>,
          actionsHost,
        )}

      {editingNote && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>{editingNote === 'new' ? '노트 추가' : '노트 수정'}</p>
              <button type="button" className={styles.closeButton} onClick={closeForm} aria-label="닫기">
                ✕
              </button>
            </div>
            <input className={styles.input} placeholder="업체명" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />

            <p className={styles.label}>카테고리</p>
            <div className={styles.chipRow}>
              {WEDDING_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={c === vendorType ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setVendorType(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className={styles.formRow}>
              <input type="date" className={styles.input} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              <div className={styles.chipRow}>
                <button type="button" className={status === 'scheduled' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('scheduled')}>
                  예정
                </button>
                <button type="button" className={status === 'done' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('done')}>
                  완료
                </button>
              </div>
            </div>

            <label className={styles.label}>담당자 연락처</label>
            <input
              type="tel"
              className={styles.input}
              placeholder="010-0000-0000"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />

            <p className={styles.label}>업체 위치</p>
            <div className={styles.chipRow}>
              {PLACE_SEARCH_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={mode.key === placeSearchMode ? `${styles.chip} ${styles.chipActive}` : styles.chip}
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
                  setAddress('');
                  setCoords(null);
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
                        <span className={styles.placeResultName}><IconPin /> {place.placeName}</span>
                        <span className={styles.placeResultAddress}>{place.addressName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {address && <p className={styles.addressText}><IconPin /> {address}</p>}
            {coords && <KakaoMap markers={[{ id: 'selected', lat: coords.lat, lng: coords.lng }]} className={styles.mapPreview} />}

            <textarea className={styles.textarea} placeholder="핵심 메모 (줄바꿈으로 구분)" value={keyMemos} onChange={(e) => setKeyMemos(e.target.value)} />
            <textarea className={styles.textarea} placeholder="물어볼 것 (줄바꿈으로 구분)" value={questions} onChange={(e) => setQuestions(e.target.value)} />

            <p className={styles.label}>
              사진 <span className={styles.photoCount}>{existingPhotos.length + newPhotos.length}/{MAX_PHOTOS}</span>
            </p>
            <div className={styles.photoGrid}>
              {existingPhotos.map((photo, i) => (
                <div
                  key={`existing-${i}`}
                  className={styles.photoThumb}
                  style={{ backgroundImage: photo.imageUrl ? `url(${photo.imageUrl})` : undefined, background: photo.imageUrl ? undefined : photo.gradient }}
                >
                  <button type="button" className={styles.photoRemove} onClick={() => removeExistingPhoto(i)} aria-label="사진 삭제">
                    ✕
                  </button>
                </div>
              ))}
              {newPhotos.map((photo, i) => (
                <div key={i} className={styles.photoThumb} style={{ backgroundImage: `url(${photo.previewUrl})` }}>
                  <button type="button" className={styles.photoRemove} onClick={() => removeNewPhoto(i)} aria-label="사진 삭제">
                    ✕
                  </button>
                </div>
              ))}
              {existingPhotos.length + newPhotos.length < MAX_PHOTOS && (
                <label className={styles.photoAdd}>
                  +
                  <input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange} />
                </label>
              )}
            </div>

            <button type="button" className={styles.submit} onClick={handleSubmit}>
              {editingNote === 'new' ? '추가하기' : '저장하기'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {(notes ?? []).map((note) => (
          <button key={note.id} type="button" className={styles.card} onClick={() => openEdit(note)}>
            <div className={styles.cardHead}>
              <p className={styles.vendorName}>{note.vendorName}</p>
              <span className={note.status === 'done' ? styles.badgeDone : styles.badgeScheduled}>{note.status === 'done' ? '완료' : '예정'}</span>
            </div>
            <p className={styles.vendorMeta}>
              {note.vendorType} · {note.visitDate}
              {note.address && ` · ${note.address}`}
              {note.contactPhone && ` · ${note.contactPhone}`}
            </p>
            {note.photos.length > 0 && (
              <div className={styles.cardPhotoRow}>
                {note.photos.map((photo, i) => (
                  <span key={i} className={styles.cardPhotoThumb} style={{ background: photo.gradient }} />
                ))}
              </div>
            )}
            {note.keyMemos.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>핵심 메모</p>
                {note.keyMemos.map((memo, i) => (
                  <p key={i} className={styles.item}>
                    ✓ {memo}
                  </p>
                ))}
              </div>
            )}
            {note.questions.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>물어볼 것</p>
                {note.questions.map((question, i) => (
                  <p key={i} className={styles.item}>
                    ? {question}
                  </p>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
