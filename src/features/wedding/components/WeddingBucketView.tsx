import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { IconPin, IconTrash } from '@/shared/components/ui/icons';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { usePlaceSearch } from '@/shared/lib/kakao/usePlaceSearch';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import { useWeddingActionsHost } from '../actionsPortal';
import {
  useBuckets,
  useCreateBucket,
  useDeleteBucket,
  useSetBucketCoverPhoto,
  useUpdateBucket,
} from '../hooks/useWeddingData';
import type { BucketCategory, BucketItem } from '../types';
import { BUCKET_CATEGORIES } from '../types';
import styles from './WeddingBucketView.module.css';

// 버킷 = 아직 방문 전인 관심 업체를 카테고리별로 담아두는 카드 목록(2026-09-03 사용자 지정).
// 카드는 대표 사진 1장 + 카테고리/업체명/링크만 보여주고, 나머지(주소·메모·사진 전체)는
// 카드를 눌러 여는 자세히 보기에서 다룬다. 자세히 보기는 라우트가 아니라 ?item=<id>로 연다
// (CLAUDE.md — 모달은 쿼리 파라미터로).
const MAX_PHOTOS = 8;

interface NewPhoto {
  file: File;
  previewUrl: string;
}

export function WeddingBucketView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: buckets } = useBuckets(workspaceId);
  const createBucket = useCreateBucket(workspaceId);
  const updateBucket = useUpdateBucket(workspaceId);
  const deleteBucket = useDeleteBucket(workspaceId);
  const setCover = useSetBucketCoverPhoto(workspaceId);
  const actionsHost = useWeddingActionsHost();

  const [searchParams, setSearchParams] = useSearchParams();
  const openedId = searchParams.get('item');
  const opened = (buckets ?? []).find((item) => item.id === openedId) ?? null;

  const [editing, setEditing] = useState<BucketItem | 'new' | null>(null);
  const [category, setCategory] = useState<BucketCategory>('웨딩홀');
  const [vendorName, setVendorName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [memo, setMemo] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<BucketItem['photos']>([]);
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  // 대표 사진 후보. 'existing:<photoId>'는 이미 올라간 사진, 'new:<index>'는 이번에 올리는 사진.
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const place = usePlaceSearch({
    placePlaceholder: '장소 검색 (예: 논현 W웨딩홀)',
    addressPlaceholder: '주소 검색 (예: 강남구 논현동 200)',
  });

  const newPhotosRef = useRef<NewPhoto[]>([]);
  newPhotosRef.current = newPhotos;
  useEffect(() => () => newPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  function openNew() {
    setCategory('웨딩홀');
    setVendorName('');
    setLinkUrl('');
    setMemo('');
    setExistingPhotos([]);
    setRemovedPhotoPaths([]);
    setNewPhotos([]);
    setCoverKey(null);
    place.reset();
    setEditing('new');
  }

  function openEdit(item: BucketItem) {
    setCategory(item.category);
    setVendorName(item.vendorName);
    setLinkUrl(item.linkUrl);
    setMemo(item.memo);
    setExistingPhotos(item.photos);
    setRemovedPhotoPaths([]);
    setNewPhotos([]);
    setCoverKey(item.photos.find((p) => p.isCover) ? `existing:${item.photos.find((p) => p.isCover)!.id}` : null);
    place.reset({
      placeName: item.vendorName,
      address: item.address,
      coords: item.lat !== null && item.lng !== null ? { lat: item.lat, lng: item.lng } : null,
    });
    setEditing(item);
  }

  function closeForm() {
    newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setNewPhotos([]);
    setEditing(null);
  }

  function openDetail(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set('item', id);
    setSearchParams(next);
  }

  function closeDetail() {
    const next = new URLSearchParams(searchParams);
    next.delete('item');
    setSearchParams(next, { replace: true });
    setConfirmingDelete(false);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const room = MAX_PHOTOS - existingPhotos.length - newPhotos.length;
    const accepted = files.slice(0, Math.max(0, room)).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setNewPhotos((prev) => {
      const next = [...prev, ...accepted];
      // 아직 대표를 안 골랐으면 첫 장을 대표로 잡아둔다 — 카드 썸네일이 비는 것을 막는다.
      if (coverKey === null && existingPhotos.length === 0 && next.length > 0) setCoverKey('new:0');
      return next;
    });
    event.target.value = '';
  }

  function removeNewPhoto(index: number) {
    URL.revokeObjectURL(newPhotos[index].previewUrl);
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    // 인덱스로 가리키던 대표가 흔들리므로, 지운 장이 대표였거나 뒤 장이면 대표 선택을 비운다.
    setCoverKey((prev) => {
      if (!prev?.startsWith('new:')) return prev;
      const coverIndex = Number(prev.slice(4));
      if (coverIndex === index) return null;
      return coverIndex > index ? `new:${coverIndex - 1}` : prev;
    });
  }

  function removeExistingPhoto(photoId: string, path: string) {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setRemovedPhotoPaths((prev) => [...prev, path]);
    setCoverKey((prev) => (prev === `existing:${photoId}` ? null : prev));
  }

  const isSaving = createBucket.isPending || updateBucket.isPending;

  function handleSubmit() {
    if (!vendorName.trim() || !workspaceId) return;
    const newCoverIndex = coverKey?.startsWith('new:') ? Number(coverKey.slice(4)) : null;
    const fields = {
      category,
      vendorName: vendorName.trim(),
      address: place.address,
      lat: place.coords?.lat ?? null,
      lng: place.coords?.lng ?? null,
      linkUrl: linkUrl.trim(),
      memo: memo.trim(),
    };

    if (editing === 'new') {
      createBucket.mutate(
        { ...fields, photoFiles: newPhotos.map((p) => p.file), coverIndex: newCoverIndex },
        { onSuccess: closeForm },
      );
      return;
    }
    if (!editing) return;

    const target = editing;
    updateBucket.mutate(
      {
        id: target.id,
        ...fields,
        removedPhotoPaths,
        newPhotoFiles: newPhotos.map((p) => p.file),
        newCoverIndex,
      },
      {
        onSuccess: () => {
          // 남아 있는 사진 중에서 대표를 바꿨으면 그것도 반영한다(새 사진 대표는 저장 경로가 처리).
          const existingCover = coverKey?.startsWith('existing:') ? coverKey.slice(9) : null;
          const wasCover = target.photos.find((p) => p.isCover)?.id ?? null;
          if (existingCover && existingCover !== wasCover) setCover.mutate(existingCover);
          closeForm();
        },
      },
    );
  }

  return (
    <div className={styles.wrap}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={openNew}>
            + 업체 담기
          </button>,
          actionsHost,
        )}

      {(buckets ?? []).length === 0 && <p className={styles.empty}>담아둔 업체가 없어요. 마음에 드는 곳을 카드로 모아두세요.</p>}

      <div className={styles.grid}>
        {(buckets ?? []).map((item) => {
          const cover = item.photos[0];
          return (
            <button key={item.id} type="button" className={styles.card} onClick={() => openDetail(item.id)}>
              <span
                className={styles.cardThumb}
                style={
                  cover?.imageUrl
                    ? { backgroundImage: `url(${cover.imageUrl})` }
                    : { background: cover?.gradient ?? 'var(--color-bg-soft)' }
                }
              >
                {!cover && <span className={styles.cardThumbEmpty}>사진 없음</span>}
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardCategory}>{item.category}</span>
                <span className={styles.cardTitle}>{item.vendorName}</span>
                {item.linkUrl && <span className={styles.cardLink}>{item.linkUrl}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {opened && (
        <div className={styles.overlay} onClick={closeDetail}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>{opened.vendorName}</p>
              <div className={styles.detailActions}>
                <button type="button" className={styles.detailAction} onClick={() => openEdit(opened)}>
                  수정
                </button>
                {confirmingDelete ? (
                  <>
                    <span className={styles.confirmText}>삭제할까요?</span>
                    <button
                      type="button"
                      className={styles.detailActionDanger}
                      disabled={deleteBucket.isPending}
                      onClick={() => deleteBucket.mutate(opened.id, { onSuccess: closeDetail })}
                    >
                      삭제
                    </button>
                    <button type="button" className={styles.detailAction} onClick={() => setConfirmingDelete(false)}>
                      취소
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.detailAction} onClick={() => setConfirmingDelete(true)}>
                    <IconTrash />
                  </button>
                )}
                <button type="button" className={styles.closeButton} onClick={closeDetail} aria-label="닫기">
                  ✕
                </button>
              </div>
            </div>

            <p className={styles.detailMeta}>{opened.category}</p>
            {opened.address && (
              <p className={styles.detailMeta}>
                <IconPin /> {opened.address}
              </p>
            )}
            {opened.linkUrl && (
              <a className={styles.detailLink} href={opened.linkUrl} target="_blank" rel="noreferrer noopener">
                {opened.linkUrl}
              </a>
            )}
            {opened.memo && <p className={styles.detailMemo}>{opened.memo}</p>}

            {opened.photos.length > 0 && (
              <>
                <p className={styles.label}>사진 · 대표를 고르면 카드 썸네일이 바뀝니다</p>
                <div className={styles.photoGrid}>
                  {opened.photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className={photo.isCover ? `${styles.photoThumb} ${styles.photoThumbCover}` : styles.photoThumb}
                      style={photo.imageUrl ? { backgroundImage: `url(${photo.imageUrl})` } : { background: photo.gradient }}
                      disabled={photo.isCover || setCover.isPending}
                      onClick={() => setCover.mutate(photo.id)}
                    >
                      <span className={styles.photoCoverMark}>{photo.isCover ? '대표' : '대표로'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {opened.photos.length === 0 && <p className={styles.hint}>사진이 없어요. 수정에서 추가할 수 있어요.</p>}

            {opened.lat !== null && opened.lng !== null && (
              <KakaoMap markers={[{ id: opened.id, lat: opened.lat, lng: opened.lng }]} className={styles.mapPreview} />
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>{editing === 'new' ? '업체 담기' : '업체 수정'}</p>
              <button type="button" className={styles.closeButton} onClick={closeForm} aria-label="닫기">
                ✕
              </button>
            </div>

            <p className={styles.label}>카테고리</p>
            <div className={styles.chipRow}>
              {BUCKET_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={c === category ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <input className={styles.input} placeholder="업체명" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />

            <p className={styles.label}>지역 · 주소</p>
            <div className={styles.chipRow}>
              {place.modes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={mode.key === place.mode ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => place.switchMode(mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className={styles.placeSearch}>
              <input
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
                        <span className={styles.placeResultName}>
                          <IconPin /> {result.placeName}
                        </span>
                        <span className={styles.placeResultAddress}>{result.addressName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {place.address && (
              <p className={styles.addressText}>
                <IconPin /> {place.address}
              </p>
            )}

            <input
              className={styles.input}
              placeholder="링크 (홈페이지 · 인스타 등)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <textarea className={styles.textarea} placeholder="특징 메모" value={memo} onChange={(e) => setMemo(e.target.value)} />

            <p className={styles.label}>
              사진 <span className={styles.photoCount}>{existingPhotos.length + newPhotos.length}/{MAX_PHOTOS}</span> · 대표 1장을 고르면 카드 썸네일이 됩니다
            </p>
            <div className={styles.photoGrid}>
              {existingPhotos.map((photo) => {
                const key = `existing:${photo.id}`;
                return (
                  <div
                    key={key}
                    className={coverKey === key ? `${styles.photoThumb} ${styles.photoThumbCover}` : styles.photoThumb}
                    style={photo.imageUrl ? { backgroundImage: `url(${photo.imageUrl})` } : { background: photo.gradient }}
                  >
                    <label className={styles.photoCoverPick}>
                      <input type="radio" name="bucket-cover" checked={coverKey === key} onChange={() => setCoverKey(key)} />
                      대표
                    </label>
                    <button
                      type="button"
                      className={styles.photoRemove}
                      onClick={() => removeExistingPhoto(photo.id, photo.path)}
                      aria-label="사진 삭제"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {newPhotos.map((photo, i) => {
                const key = `new:${i}`;
                return (
                  <div
                    key={key}
                    className={coverKey === key ? `${styles.photoThumb} ${styles.photoThumbCover}` : styles.photoThumb}
                    style={{ backgroundImage: `url(${photo.previewUrl})` }}
                  >
                    <label className={styles.photoCoverPick}>
                      <input type="radio" name="bucket-cover" checked={coverKey === key} onChange={() => setCoverKey(key)} />
                      대표
                    </label>
                    <button type="button" className={styles.photoRemove} onClick={() => removeNewPhoto(i)} aria-label="사진 삭제">
                      ✕
                    </button>
                  </div>
                );
              })}
              {existingPhotos.length + newPhotos.length < MAX_PHOTOS && (
                <label className={styles.photoAdd}>
                  +
                  <input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange} />
                </label>
              )}
            </div>

            <button type="button" className={styles.submit} disabled={isSaving || !vendorName.trim()} onClick={handleSubmit}>
              {isSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
