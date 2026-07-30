import { Link } from 'react-router-dom';
import { LoveCalendarView } from '@/features/love/components/LoveCalendarView';
import { useLoveRecords } from '@/features/love/hooks/useLoveRecords';
import { useCheckups } from '@/features/pregnancy/hooks/usePregnancyData';
import { RecordThumbnail } from '@/shared/components/record/RecordThumbnail';
import { computeChecklistProgress, computeDday } from '@/features/wedding/deriveStats';
import { usePrepItems, useWeddingDate } from '@/features/wedding/hooks/useWeddingData';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import { isMaster } from '@/shared/lib/rbac/permissions';
import styles from './DashboardPage.module.css';

// 함께/셋이 카드의 D+/D-DAY와 "처음" 카드는 관리 페이지에서 입력한 workspace 날짜
// (useWorkspaceSettings)로 실시간 파생 계산한다(2026-07-23). "요즘 우리" 카드도 실데이터
// (연애 최신 기록/결혼 다음 일정/임신 다음 검진)를 그대로 보여주고, 없으면 빈 상태를 보여준다
// (2026-07-28: mockDashboard.ts 하드코딩 문구 제거).
function daysBetween(fromIso: string, now = new Date()): number {
  const from = new Date(fromIso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round(diffMs / 86400000);
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}/${mm}/${dd}`;
}

function formatDateTimeLabel(iso: string): string {
  const date = new Date(iso);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const hours = date.getHours();
  const ampm = hours < 12 ? '오전' : '오후';
  const hour12 = String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday}) ${ampm} ${hour12}:${minutes}`;
}

export default function DashboardPage() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const { data: settings } = useWorkspaceSettings();
  const { data: weddingDate } = useWeddingDate();
  const { data: prepItems } = usePrepItems(membership?.workspaceId);
  const { data: loveRecords } = useLoveRecords(membership?.workspaceId);
  const { data: checkups } = useCheckups(membership?.workspaceId);
  const checklistProgress = computeChecklistProgress(prepItems ?? []);
  const daysTogether = settings?.coupleStartDate ? daysBetween(settings.coupleStartDate) : 0;
  const weddingDday = weddingDate ? computeDday(weddingDate) : null;
  const birthDday = settings?.dueDate ? -daysBetween(settings.dueDate) : null;

  const latestLoveRecord = [...(loveRecords ?? [])].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )[0];

  const now = Date.now();
  const nextWeddingEvent = (prepItems ?? [])
    .filter((item) => item.schedule && new Date(item.schedule.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.schedule!.scheduledAt).getTime() - new Date(b.schedule!.scheduledAt).getTime())[0];

  const nextCheckup = (checkups ?? [])
    .filter((c) => new Date(c.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>OURS ARCHIVE</p>
        <h1 className={styles.title}>
          우리의 <span className={styles.titleAccent}>모든 순간,</span>
        </h1>
        <p className={styles.subtitle}>— 작지만 소중한 과거의, 지금의 우리</p>

        <div className={styles.heroRow}>
          <div className={styles.ctaGroup}>
            <Link to="/love/create" className={styles.ctaPrimary}>
              <img src="/icons/write.png" alt="" width={14} height={14} />
              사진기록
            </Link>
            <Link to="/love/plan/create" className={styles.ctaPrimary}>
              <img src="/icons/write.png" alt="" width={14} height={14} />
              일정기록
            </Link>
            {isMaster(membership?.role) && (
              <Link to="/admin/members" className={styles.ctaSecondary}>
                <img src="/icons/admin.png" alt="" width={14} height={14} />
                관리
              </Link>
            )}
          </div>

          <div className={styles.summaryCards}>
            <Link to="/admin/members" className={`${styles.summaryCard} ${styles.summaryCardStart}`}>
              <span className={styles.summaryLabel}>처음</span>
              <span className={styles.summaryValue}>{settings?.firstMetDate ? formatShortDate(settings.firstMetDate) : '-'}</span>
            </Link>
            <Link to="/love" className={`${styles.summaryCard} ${styles.summaryCardLove}`}>
              <span className={styles.summaryLabel}>함께</span>
              <span className={styles.summaryValue}>D+{daysTogether}</span>
            </Link>
            <Link to="/wedding" className={`${styles.summaryCard} ${styles.summaryCardWedding}`}>
              <span className={styles.summaryLabel}>하나가</span>
              <span className={styles.summaryValue}>
                {weddingDday !== null ? `D${weddingDday > 0 ? '-' : '+'}${Math.abs(weddingDday)}` : '-'}
              </span>
            </Link>
            <Link to="/pregnancy" className={`${styles.summaryCard} ${styles.summaryCardPregnancy}`}>
              <span className={styles.summaryLabel}>셋이</span>
              <span className={styles.summaryValue}>{birthDday !== null ? `D${birthDday > 0 ? '-' : '+'}${Math.abs(birthDday)}` : '-'}</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.calendarSection}>
        <p className={styles.eyebrow}>CALENDAR</p>
        <h2 className={styles.recentTitle}>
          우리 <span className={styles.titleAccent}>일정,</span>
        </h2>
        <LoveCalendarView />
      </section>

      <section className={styles.recent}>
        <p className={styles.eyebrow}>RECENT</p>
        <h2 className={styles.recentTitle}>
          요즘 <span className={styles.titleAccent}>우리,</span>
        </h2>

        <div className={styles.recentGrid}>
          <Link to="/love" className={styles.recentCard}>
            {latestLoveRecord?.photos[0] ? (
              <RecordThumbnail
                gradient={latestLoveRecord.photos[0].gradient}
                imageUrl={latestLoveRecord.photos[0].imageUrl}
                alt=""
                className={styles.recentImage}
              />
            ) : (
              <div className={styles.recentImage} aria-hidden="true" />
            )}
            <div className={styles.recentBody}>
              <p className={styles.recentTag}>LOVE · 최신 기록</p>
              {latestLoveRecord ? (
                <>
                  <p className={styles.recentText}>{latestLoveRecord.body}</p>
                  <p className={styles.recentMeta}>📍 {latestLoveRecord.placeName}</p>
                </>
              ) : (
                <p className={styles.recentMeta}>아직 기록이 없어요.</p>
              )}
            </div>
          </Link>

          <Link to="/wedding" className={styles.recentCard}>
            <div className={styles.recentBody}>
              <p className={styles.recentTag}>WEDDING · 다음 일정</p>
              {nextWeddingEvent ? (
                <>
                  <p className={styles.recentText}>{nextWeddingEvent.title}</p>
                  <p className={styles.recentMeta}>{nextWeddingEvent.schedule!.location}</p>
                  <p className={styles.recentMeta}>📅 {formatDateTimeLabel(nextWeddingEvent.schedule!.scheduledAt)}</p>
                </>
              ) : (
                <p className={styles.recentMeta}>예정된 일정이 없어요.</p>
              )}
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${checklistProgress.percent}%` }} />
              </div>
              <p className={styles.progressLabel}>
                투두 진행 {checklistProgress.done}/{checklistProgress.total}
              </p>
            </div>
          </Link>

          <Link to="/pregnancy" className={styles.recentCard}>
            <div className={styles.recentBody}>
              <p className={styles.recentTag}>PREGNANCY · 다음 검진</p>
              {nextCheckup ? (
                <>
                  <p className={styles.recentText}>{nextCheckup.title}</p>
                  <p className={styles.recentMeta}>
                    {nextCheckup.hospital} · {nextCheckup.doctor}
                  </p>
                  <p className={styles.recentMeta}>📅 {formatDateTimeLabel(nextCheckup.scheduledAt)}</p>
                  <p className={styles.recentMeta}>현재 {nextCheckup.weekNo}주</p>
                </>
              ) : (
                <p className={styles.recentMeta}>예정된 검진이 없어요.</p>
              )}
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
