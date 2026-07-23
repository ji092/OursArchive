import { useState } from 'react';
import { useCreatePrepItem, usePrepItems } from '../hooks/useWeddingData';
import type { WeddingEventType } from '../types';
import styles from './WeddingScheduleView.module.css';

const EVENT_TYPES: WeddingEventType[] = ['상담', '계약', '청첩장모임', '본식', '기타'];

function eventTypeLabel(type: WeddingEventType): string {
  return type === '청첩장모임' ? '청모' : type;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function WeddingScheduleView() {
  const { data: items } = usePrepItems();
  const createItem = useCreatePrepItem();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<WeddingEventType>('상담');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');

  const scheduled = (items ?? [])
    .filter((item) => item.schedule)
    .sort((a, b) => new Date(a.schedule!.scheduledAt).getTime() - new Date(b.schedule!.scheduledAt).getTime());

  function handleAdd() {
    if (!title.trim()) return;
    createItem.mutate(
      {
        title: title.trim(),
        category: '기타',
        assigneeName: null,
        schedule: { scheduledAt: new Date(`${date}T${time}:00`).toISOString(), location, eventType },
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setTitle('');
          setLocation('');
        },
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}>일정</p>
        <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
          + 일정 추가
        </button>
      </div>

      {showForm && (
        <div className={styles.form}>
          <input className={styles.input} placeholder="일정 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <div className={styles.formRow}>
            <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" className={styles.input} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <input className={styles.input} placeholder="장소" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button type="button" className={styles.submit} onClick={handleAdd}>
            추가하기
          </button>
        </div>
      )}

      <div className={styles.timeline}>
        {scheduled.map((item) => (
          <div key={item.id} className={styles.timelineItem}>
            <span className={item.schedule!.eventType === '본식' ? `${styles.badge} ${styles.badgeMain}` : styles.badge}>
              {eventTypeLabel(item.schedule!.eventType)}
            </span>
            <div>
              <p className={styles.itemTitle}>{item.title}</p>
              <p className={styles.itemMeta}>
                {item.schedule!.location} · {formatDate(item.schedule!.scheduledAt)}
              </p>
            </div>
          </div>
        ))}
        {scheduled.length === 0 && <p className={styles.empty}>등록된 일정이 없어요.</p>}
      </div>
    </div>
  );
}
