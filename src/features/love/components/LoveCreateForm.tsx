import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchKakaoAddress, searchKakaoPlaces, type KakaoPlaceResult } from '@/shared/lib/kakao/kakaoPlaceSearch';
import { useCreateLoveRecord } from '../hooks/useCreateLoveRecord';
import { CURRENT_AUTHOR_NAME, LOVE_AUTHORS } from '../mockAuth';
import styles from './LoveCreateForm.module.css';

const MAX_PHOTOS = 10;
const MAX_BODY_LENGTH = 2000;

type PlaceSearchMode = 'place' | 'address';

const PLACE_SEARCH_MODES: { key: PlaceSearchMode; label: string; placeholder: string }[] = [
  { key: 'place', label: '장소검색', placeholder: '장소 검색 (예: 반포 한강공원, 스타벅스 성수점)' },
  { key: 'address', label: '주소검색', placeholder: '주소 검색 (예: 서초구 반포동 199, 올림픽대로 지하 91)' },
];

function nowDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeValue(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function LoveCreateForm() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateLoveRecord();

  const [authorName, setAuthorName] = useState<string>(CURRENT_AUTHOR_NAME);
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [body, setBody] = useState('');
  const [date, setDate] = useState(nowDateValue());
  const [time, setTime] = useState(nowTimeValue());
  const [placeSearchMode, setPlaceSearchMode] = useState<PlaceSearchMode>('place');
  const [placeName, setPlaceName] = useState('');
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPlaceListOpen, setIsPlaceListOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<KakaoPlaceResult[]>([]);
  const [errors, setErrors] = useState<{ body?: string; placeName?: string }>({});

  // 카카오 로컬 검색 API(장소검색/주소검색)를 300ms 디바운스로 호출한다.
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
    setPlaceCoords(null);
    setPlaceSuggestions([]);
  }

  function selectPlace(place: KakaoPlaceResult) {
    setPlaceName(place.placeName);
    setPlaceCoords({ lat: place.lat, lng: place.lng });
    setIsPlaceListOpen(false);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const room = MAX_PHOTOS - photos.length;
    const accepted = files.slice(0, room).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...accepted]);
    event.target.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // 요구사항 3.2.6: 장소·날짜는 예외 없이 필수 (지도·달력 뷰가 항상 채워지도록).
    const nextErrors: typeof errors = {};
    if (!body.trim()) nextErrors.body = '내용을 입력해주세요.';
    if (!placeName.trim()) nextErrors.placeName = '장소를 입력해주세요.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const recordedAt = new Date(`${date}T${time}:00`).toISOString();

    mutate(
      {
        authorName,
        body: body.trim(),
        placeName: placeName.trim(),
        lat: placeCoords?.lat,
        lng: placeCoords?.lng,
        recordedAt,
        photoCount: photos.length,
      },
      { onSuccess: () => navigate('/love') },
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>작성자</label>
        <div className={styles.authorToggle}>
          {LOVE_AUTHORS.map((name) => (
            <button
              key={name}
              type="button"
              className={name === authorName ? `${styles.authorButton} ${styles.authorButtonActive}` : styles.authorButton}
              onClick={() => setAuthorName(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          사진·영상 <span className={styles.optional}>{photos.length}/{MAX_PHOTOS}</span>
        </label>
        <label className={styles.dropzone}>
          <input type="file" accept="image/*,video/mp4" multiple hidden onChange={handlePhotoChange} disabled={photos.length >= MAX_PHOTOS} />
          사진이나 영상을 클릭해서 선택
          <span className={styles.dropzoneHint}>JPG, PNG, GIF, MP4 · 최대 10개</span>
        </label>
        {photos.length > 0 && (
          <div className={styles.photoGrid}>
            {photos.map((photo, index) => (
              <div key={photo.previewUrl} className={styles.photoItem}>
                {photo.file.type.startsWith('video') ? (
                  <span className={styles.videoBadge}>🎬 {photo.file.name}</span>
                ) : (
                  <img src={photo.previewUrl} alt={`첨부 ${index + 1}`} className={styles.photoPreview} />
                )}
                <button type="button" className={styles.photoRemove} onClick={() => removePhoto(index)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="love-body">
          내용 <span className={styles.required}>*</span>
        </label>
        <textarea
          id="love-body"
          className={styles.textarea}
          placeholder="오늘 어떤 추억을 남기고 싶으세요?"
          value={body}
          maxLength={MAX_BODY_LENGTH}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className={styles.textareaFooter}>
          {errors.body && <span className={styles.errorText}>{errors.body}</span>}
          <span className={styles.counter}>
            {body.length}/{MAX_BODY_LENGTH}
          </span>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          날짜 및 시간 <span className={styles.required}>*</span>
        </label>
        <div className={styles.dateRow}>
          <input type="date" className={styles.input} value={date} onChange={(event) => setDate(event.target.value)} required />
          <input type="time" className={styles.input} value={time} onChange={(event) => setTime(event.target.value)} required />
        </div>
        <p className={styles.hint}>과거의 추억도 기록할 수 있도록 날짜를 직접 선택할 수 있어요.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="love-place">
          장소 <span className={styles.required}>*</span>
        </label>
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
            id="love-place"
            className={styles.input}
            placeholder={PLACE_SEARCH_MODES.find((mode) => mode.key === placeSearchMode)!.placeholder}
            value={placeName}
            onChange={(event) => {
              setPlaceName(event.target.value);
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
        {errors.placeName && <span className={styles.errorText}>{errors.placeName}</span>}
      </div>

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? '저장 중…' : '기록 저장하기'}
      </button>
    </form>
  );
}
