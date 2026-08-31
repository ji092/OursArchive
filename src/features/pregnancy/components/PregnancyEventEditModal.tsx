import { useEffect, useState } from 'react';
import { IconPin } from '@/shared/components/ui/icons';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { AckRoleSelect } from '@/shared/components/schedule/AckRoleSelect';
import { usePlaceSearch } from '@/shared/lib/kakao/usePlaceSearch';
import { useCreateEvent, useUpdateEvent } from '../hooks/usePregnancyData';
import { useCurrentWorkspaceId, useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { createScheduleAck } from '@/shared/lib/schedule/scheduleAckApi';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import type { AckRole } from '@/shared/lib/schedule/types';
import type { PregnancyEvent, PregnancyEventType } from '../types';
import { EVENT_TYPES } from './PregnancyScheduleView';
import styles from './PregnancyEventEditModal.module.css';

export interface PregnancyEventEditModalProps {
  event?: PregnancyEvent;
  onClose: () => void;
}

// 일정 탭 "+ 일정 추가" 팝업 — 결혼(하나가) 챕터의 ScheduleEditModal과 동일 구조(장소검색+지도+주소
// 표시), 체크리스트/상담노트 연결처럼 임신 챕터에 아직 없는 개념은 뺐다. event가 있으면 수정 모드.
export function PregnancyEventEditModal({ event, onClose }: PregnancyEventEditModalProps) {
  const workspaceId = useCurrentWorkspaceId();
  const { session } = useSession();
  const { data: myMembership } = useMyMembership(session?.user.id);
  const createEvent = useCreateEvent(workspaceId);
  const updateEvent = useUpdateEvent(workspaceId);

  const [title, setTitle] = useState(event?.title ?? '');
  const [eventType, setEventType] = useState<PregnancyEventType>(event?.eventType ?? '태교');
  const [date, setDate] = useState(event ? event.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(event ? event.scheduledAt.slice(11, 16) : '10:00');
  const place = usePlaceSearch({
    placePlaceholder: '장소 검색 (예: 분당 맘스요가)',
    addressPlaceholder: '주소 검색 (예: 분당구 정자동 100)',
    initial: { placeName: event?.location ?? '' },
  });
  const [ackRole, setAckRole] = useState<AckRole>('partner');

  useEffect(() => {
    if (myMembership?.role === 'master') setAckRole('partner');
    else if (myMembership?.role === 'partner') setAckRole('master');
  }, [myMembership?.role]);


  function handleSubmit() {
    const userId = session?.user.id;
    if (!title.trim() || !place.placeName.trim() || !workspaceId || !userId) return;
    const input = {
      title: title.trim(),
      eventType,
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      location: place.placeName.trim(),
    };

    function ack(sourceId: string) {
      createScheduleAck({ sourceType: 'pregnancy_event', sourceId, workspaceId: workspaceId!, createdBy: userId!, ackRole }).catch((cause) => reportFailure('일정은 저장됐지만 확인 알림 설정에 실패했어요. 일정을 수정해 확인 대상을 다시 지정해주세요.', cause));
    }

    if (event) {
      updateEvent.mutate({ id: event.id, input }, { onSuccess: () => { ack(event.id); onClose(); } });
    } else {
      createEvent.mutate(input, { onSuccess: (newId) => { ack(newId); onClose(); } });
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.headerTitle}>{event ? '일정 수정' : '일정 추가'}</p>
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
        {place.address && <p className={styles.addressText}><IconPin /> {place.address}</p>}
        {place.coords && (
          <KakaoMap markers={[{ id: 'selected', lat: place.coords.lat, lng: place.coords.lng }]} className={styles.mapPreview} />
        )}

        <AckRoleSelect value={ackRole} onChange={setAckRole} />

        <button type="button" className={styles.submit} onClick={handleSubmit}>
          {event ? '저장하기' : '추가하기'}
        </button>
      </div>
    </div>
  );
}
