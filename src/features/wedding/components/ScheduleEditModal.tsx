import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPin } from '@/shared/components/ui/icons';
import { KakaoMap } from '@/shared/components/map/KakaoMap';
import { AckRoleSelect } from '@/shared/components/schedule/AckRoleSelect';
import { usePlaceSearch } from '@/shared/lib/kakao/usePlaceSearch';
import {
  useConsultNotes,
  useCreatePrepItem,
  useDeleteWeddingSchedule,
  usePrepItems,
  useUpdatePrepItem,
} from '../hooks/useWeddingData';
import { useCurrentWorkspaceId, useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { createScheduleAck } from '@/shared/lib/schedule/scheduleAckApi';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import type { AckRole } from '@/shared/lib/schedule/types';
import type { PrepItem, WeddingEventType } from '../types';
import { EVENT_TYPES, eventTypeLabel } from './WeddingScheduleView';
import styles from './ScheduleEditModal.module.css';

export interface ScheduleEditModalProps {
  item?: PrepItem; // 넘기면 수정 모드
  onClose: () => void;
}

// 로컬 시각 기준으로 <input type="date"/"time">에 넣을 값을 만든다 — ISO 문자열을 그대로 자르면
// UTC라 저녁 일정이 하루 전으로 보인다.
function toLocalDateValue(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toLocalTimeValue(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 일정 탭 "+ 일정 추가" 팝업 — 체크리스트 항목과 연결(선택)/상담노트 다중 연결/장소 검색+지도+주소 표시를
// 함께 처리한다. item을 넘기면 같은 폼이 수정·삭제 모드로 동작한다(2026-08-31 추가 — 그전에는
// 추가만 되고 고치거나 지울 방법이 없었다). 다른 챕터에 재사용하지 않는다.
export function ScheduleEditModal({ item, onClose }: ScheduleEditModalProps) {
  const isEditing = !!item;
  const workspaceId = useCurrentWorkspaceId();
  const { session } = useSession();
  const { data: myMembership } = useMyMembership(session?.user.id);
  const { data: items } = usePrepItems(workspaceId);
  const { data: consultNotes } = useConsultNotes(workspaceId);
  const createItem = useCreatePrepItem(workspaceId);
  const updateItem = useUpdatePrepItem(workspaceId);
  const deleteSchedule = useDeleteWeddingSchedule(workspaceId);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const linkableItems = (items ?? []).filter((item) => item.checklist && !item.schedule);

  const [linkedItemId, setLinkedItemId] = useState('');
  const [title, setTitle] = useState(item?.title ?? '');
  const [eventType, setEventType] = useState<WeddingEventType>(item?.schedule?.eventType ?? '상담');
  const [date, setDate] = useState(item?.schedule ? toLocalDateValue(item.schedule.scheduledAt) : toLocalDateValue(new Date().toISOString()));
  const [time, setTime] = useState(item?.schedule ? toLocalTimeValue(item.schedule.scheduledAt) : '10:00');
  const place = usePlaceSearch({
    placePlaceholder: '장소 검색 (예: 논현 W웨딩홀)',
    addressPlaceholder: '주소 검색 (예: 강남구 논현동 200)',
    initial: { placeName: item?.schedule?.location ?? '' },
  });
  const [consultNoteIds, setConsultNoteIds] = useState<string[]>(item?.consultNoteIds ?? []);
  const [ackRole, setAckRole] = useState<AckRole>('partner');

  useEffect(() => {
    if (myMembership?.role === 'master') setAckRole('partner');
    else if (myMembership?.role === 'partner') setAckRole('master');
  }, [myMembership?.role]);

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

  function handleDelete() {
    if (!item) return;
    deleteSchedule.mutate(item.id, { onSuccess: onClose });
  }

  function handleSubmit() {
    const userId = session?.user.id;
    if (!title.trim() || !place.placeName.trim() || !workspaceId || !userId) return;
    const schedule = { scheduledAt: new Date(`${date}T${time}:00`).toISOString(), location: place.placeName.trim(), eventType };

    function ack(sourceId: string) {
      createScheduleAck({ sourceType: 'wedding_schedule', sourceId, workspaceId: workspaceId!, createdBy: userId!, ackRole }).catch((cause) => reportFailure('일정은 저장됐지만 확인 알림 설정에 실패했어요. 일정을 수정해 확인 대상을 다시 지정해주세요.', cause));
    }

    // 수정 모드 — 제목/일정/상담노트 연결만 바꾸고 체크리스트·예산은 현재 값을 그대로 둔다
    // (updatePrepItem이 넘기지 않은 속성을 유지한다).
    if (item) {
      updateItem.mutate(
        { id: item.id, patch: { title: title.trim(), schedule, consultNoteIds } },
        { onSuccess: () => { ack(item.id); onClose(); } },
      );
      return;
    }

    if (linkedItemId) {
      updateItem.mutate(
        { id: linkedItemId, patch: { schedule, consultNoteIds } },
        { onSuccess: () => { ack(linkedItemId); onClose(); } },
      );
      return;
    }
    createItem.mutate(
      { workspaceId, title: title.trim(), category: '기타', assigneeId: null, schedule, consultNoteIds },
      { onSuccess: (newId) => { ack(newId); onClose(); } },
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.headerTitle}>{isEditing ? '일정 수정' : '일정 추가'}</p>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {!isEditing && linkableItems.length > 0 && (
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
          disabled={!isEditing && !!linkedItemId}
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

        {eventType === '상담' && !isEditing && (
          <p className={styles.hint}>
            업체 상담이면 <Link to="/wedding/consult-notes">상담노트</Link>에 적는 편이 낫습니다 — 메모·질문·사진까지 한 곳에
            남고, 같은 일정으로 이 탭과 메인 달력에 함께 나옵니다.
          </p>
        )}

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

        <AckRoleSelect value={ackRole} onChange={setAckRole} />

        <button type="button" className={styles.submit} onClick={handleSubmit} disabled={updateItem.isPending || createItem.isPending}>
          {isEditing ? '저장하기' : '추가하기'}
        </button>

        {isEditing &&
          (isConfirmingDelete ? (
            <div className={styles.deleteConfirmRow}>
              <span className={styles.deleteConfirmText}>
                {item?.checklist || item?.budget
                  ? '체크리스트·예산은 남기고 일정만 삭제할까요?'
                  : '이 일정을 삭제할까요?'}
              </span>
              <button type="button" className={styles.deleteConfirm} onClick={handleDelete} disabled={deleteSchedule.isPending}>
                삭제
              </button>
              <button type="button" className={styles.deleteCancel} onClick={() => setIsConfirmingDelete(false)}>
                취소
              </button>
            </div>
          ) : (
            <button type="button" className={styles.deleteButton} onClick={() => setIsConfirmingDelete(true)}>
              일정 삭제
            </button>
          ))}
      </div>
    </div>
  );
}
