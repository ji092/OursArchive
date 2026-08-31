import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { IconPin, IconVideo } from '@/shared/components/ui/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlaceSearch } from '@/shared/lib/kakao/usePlaceSearch';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useCreateLoveRecord, useUpdateLoveRecord } from '../hooks/useCreateLoveRecord';
import { useLoveRecords } from '../hooks/useLoveRecords';
import type { LoveRecord } from '../types';
import styles from './LoveCreateForm.module.css';

const MAX_PHOTOS = 10;
const MAX_BODY_LENGTH = 2000;

function nowDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeValue(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function LoveCreateForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: membership } = useMyMembership(userId);
  const workspaceId = membership?.workspaceId;
  const { data: records } = useLoveRecords(workspaceId);
  const editingRecord = editId ? records?.find((record) => record.id === editId) : undefined;
  const isEditMode = !!editId;

  const { mutate: createRecord, isPending: isCreating } = useCreateLoveRecord(workspaceId);
  const { mutate: updateRecord, isPending: isUpdating } = useUpdateLoveRecord(workspaceId);
  const isPending = isCreating || isUpdating;

  const [existingPhotos, setExistingPhotos] = useState<LoveRecord['photos']>([]);
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [body, setBody] = useState('');
  const [date, setDate] = useState(nowDateValue());
  const [time, setTime] = useState(nowTimeValue());
  const place = usePlaceSearch({
    placePlaceholder: '장소 검색 (예: 반포 한강공원, 스타벅스 성수점)',
    addressPlaceholder: '주소 검색 (예: 서초구 반포동 199, 올림픽대로 지하 91)',
  });
  const [errors, setErrors] = useState<{ body?: string; placeName?: string }>({});
  const [hasPrefilled, setHasPrefilled] = useState(false);

  // 수정 모드일 때 기존 기록 값으로 폼을 한 번만 채운다 (레코드 로딩 타이밍 때문에 useEffect로 처리).
  useEffect(() => {
    if (!editingRecord || hasPrefilled) return;
    setBody(editingRecord.body);
    const recordedDate = new Date(editingRecord.recordedAt);
    setDate(recordedDate.toISOString().slice(0, 10));
    setTime(recordedDate.toTimeString().slice(0, 5));
    place.reset({
      placeName: editingRecord.placeName,
      coords: editingRecord.lat != null && editingRecord.lng != null ? { lat: editingRecord.lat, lng: editingRecord.lng } : null,
    });
    setExistingPhotos(editingRecord.photos);
    setHasPrefilled(true);
  }, [editingRecord, hasPrefilled]);

  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => {
      const removed = prev[index];
      if (removed) setRemovedPhotoPaths((paths) => [...paths, removed.path]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const room = MAX_PHOTOS - existingPhotos.length - photos.length;
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
    if (!userId || !workspaceId) return;

    // 요구사항 3.2.6: 장소·날짜는 예외 없이 필수 (지도·달력 뷰가 항상 채워지도록).
    const nextErrors: typeof errors = {};
    if (!body.trim()) nextErrors.body = '내용을 입력해주세요.';
    if (!place.placeName.trim()) nextErrors.placeName = '장소를 입력해주세요.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const recordedAt = new Date(`${date}T${time}:00`).toISOString();
    const newPhotoFiles = photos.map((photo) => photo.file);

    if (isEditMode && editingRecord) {
      updateRecord(
        {
          id: editingRecord.id,
          workspaceId,
          body: body.trim(),
          placeName: place.placeName.trim(),
          lat: place.coords?.lat,
          lng: place.coords?.lng,
          recordedAt,
          removedPhotoPaths,
          newPhotoFiles,
        },
        { onSuccess: () => navigate(`/love?record=${editingRecord.id}`) },
      );
    } else {
      createRecord(
        {
          workspaceId,
          authorId: userId,
          body: body.trim(),
          placeName: place.placeName.trim(),
          lat: place.coords?.lat,
          lng: place.coords?.lng,
          recordedAt,
          photoFiles: newPhotoFiles,
        },
        { onSuccess: () => navigate('/love') },
      );
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      <div className={styles.field}>
        <label className={styles.label}>
          사진·영상{' '}
          <span className={styles.optional}>
            {existingPhotos.length + photos.length}/{MAX_PHOTOS}
          </span>
        </label>
        <label className={styles.dropzone}>
          <input
            type="file"
            accept="image/*,video/mp4"
            multiple
            hidden
            onChange={handlePhotoChange}
            disabled={existingPhotos.length + photos.length >= MAX_PHOTOS}
          />
          사진이나 영상을 클릭해서 선택
          <span className={styles.dropzoneHint}>JPG, PNG, GIF, MP4 · 최대 10개</span>
        </label>
        {(existingPhotos.length > 0 || photos.length > 0) && (
          <div className={styles.photoGrid}>
            {existingPhotos.map((photo, index) => (
              <div key={`existing-${index}`} className={styles.photoItem}>
                {photo.imageUrl ? (
                  <img src={photo.imageUrl} alt={`첨부 ${index + 1}`} className={styles.photoPreview} />
                ) : (
                  <div className={styles.photoPreview} style={{ background: photo.gradient }} />
                )}
                <button type="button" className={styles.photoRemove} onClick={() => removeExistingPhoto(index)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            {photos.map((photo, index) => (
              <div key={photo.previewUrl} className={styles.photoItem}>
                {photo.file.type.startsWith('video') ? (
                  <span className={styles.videoBadge}><IconVideo /> {photo.file.name}</span>
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
          {place.modes.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={mode.key === place.mode ? `${styles.placeSearchMode} ${styles.placeSearchModeActive}` : styles.placeSearchMode}
              onClick={() => place.switchMode(mode.key)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className={styles.placeSearch}>
          <input
            id="love-place"
            className={styles.input}
            placeholder={place.activePlaceholder}
            value={place.placeName}
            onChange={(event) => place.changeQuery(event.target.value)}
            onFocus={() => place.setIsListOpen(true)}
            onBlur={() => setTimeout(() => place.setIsListOpen(false), 100)}
            autoComplete="off"
          />
          {place.isListOpen && place.suggestions.length > 0 && (
            <ul className={styles.placeResults}>
              {place.suggestions.map((result) => (
                <li key={`${result.placeName}-${result.lat}-${result.lng}`}>
                  <button type="button" className={styles.placeResultItem} onMouseDown={() => place.selectPlace(result)}>
                    <span className={styles.placeResultName}><IconPin /> {result.placeName}</span>
                    <span className={styles.placeResultAddress}>{result.addressName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors.placeName && <span className={styles.errorText}>{errors.placeName}</span>}
      </div>

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? '저장 중…' : isEditMode ? '수정 저장하기' : '기록 저장하기'}
      </button>
    </form>
  );
}
