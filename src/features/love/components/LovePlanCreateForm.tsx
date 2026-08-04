import { useEffect, useState, type FormEvent } from 'react';
import { IconPin } from '@/shared/components/ui/icons';
import { useNavigate } from 'react-router-dom';
import { AckRoleSelect } from '@/shared/components/schedule/AckRoleSelect';
import { searchKakaoAddress, searchKakaoPlaces, type KakaoPlaceResult } from '@/shared/lib/kakao/kakaoPlaceSearch';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { createScheduleAck } from '@/shared/lib/schedule/scheduleAckApi';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import type { AckRole } from '@/shared/lib/schedule/types';
import { useCreateLovePlan } from '../hooks/useCreateLovePlan';
import styles from './LoveCreateForm.module.css';

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

// 사진만 빠진 LoveCreateForm — 구성(내용/날짜·시간/장소)은 그대로 맞춘다(2026-07-30 사용자 지정).
// love_plan은 place_lat/place_lng 컬럼이 없어 좌표는 저장하지 않고 place_name만 쓴다.
export function LovePlanCreateForm() {
  const navigate = useNavigate();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: membership } = useMyMembership(userId);
  const workspaceId = membership?.workspaceId;

  const { mutate: createPlan, isPending } = useCreateLovePlan(workspaceId);

  const [body, setBody] = useState('');
  const [date, setDate] = useState(nowDateValue());
  const [time, setTime] = useState(nowTimeValue());
  const [placeSearchMode, setPlaceSearchMode] = useState<PlaceSearchMode>('place');
  const [placeName, setPlaceName] = useState('');
  const [isPlaceListOpen, setIsPlaceListOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<KakaoPlaceResult[]>([]);
  const [errors, setErrors] = useState<{ body?: string; placeName?: string }>({});
  const [ackRole, setAckRole] = useState<AckRole>('partner');

  useEffect(() => {
    if (membership?.role === 'master') setAckRole('partner');
    else if (membership?.role === 'partner') setAckRole('master');
  }, [membership?.role]);

  useEffect(() => {
    const query = placeName.trim();
    if (!query) {
      setPlaceSuggestions([]);
      return;
    }
    const search = placeSearchMode === 'address' ? searchKakaoAddress : searchKakaoPlaces;
    const timer = setTimeout(() => {
      search(query).then(setPlaceSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [placeName, placeSearchMode]);

  function switchPlaceSearchMode(mode: PlaceSearchMode) {
    setPlaceSearchMode(mode);
    setPlaceName('');
    setPlaceSuggestions([]);
  }

  function selectPlace(place: KakaoPlaceResult) {
    setPlaceName(place.placeName);
    setIsPlaceListOpen(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!workspaceId || !userId) return;

    const nextErrors: typeof errors = {};
    if (!body.trim()) nextErrors.body = '내용을 입력해주세요.';
    if (!placeName.trim()) nextErrors.placeName = '장소를 입력해주세요.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const plannedAt = new Date(`${date}T${time}:00`).toISOString();

    createPlan(
      { workspaceId, title: body.trim(), placeName: placeName.trim(), plannedAt },
      {
        onSuccess: (newId) => {
          createScheduleAck({ sourceType: 'love_plan', sourceId: newId, workspaceId, createdBy: userId, ackRole }).catch((cause) => reportFailure('일정은 저장됐지만 확인 알림 설정에 실패했어요. 일정을 수정해 확인 대상을 다시 지정해주세요.', cause));
          navigate('/love/calendar');
        },
      },
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="love-plan-body">
          내용 <span className={styles.required}>*</span>
        </label>
        <textarea
          id="love-plan-body"
          className={styles.textarea}
          placeholder="어떤 일정을 알려주고 싶으세요?"
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
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="love-plan-place">
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
            id="love-plan-place"
            className={styles.input}
            placeholder={PLACE_SEARCH_MODES.find((mode) => mode.key === placeSearchMode)!.placeholder}
            value={placeName}
            onChange={(event) => {
              setPlaceName(event.target.value);
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
        {errors.placeName && <span className={styles.errorText}>{errors.placeName}</span>}
      </div>

      <AckRoleSelect value={ackRole} onChange={setAckRole} />

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? '저장 중…' : '일정 저장하기'}
      </button>
    </form>
  );
}
