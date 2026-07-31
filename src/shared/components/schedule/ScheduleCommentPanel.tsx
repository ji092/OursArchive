import { useState, type FormEvent } from 'react';
import { useAddScheduleComment, useDeleteScheduleComment, useScheduleComments } from '@/shared/hooks/useScheduleComments';
import type { ScheduleSourceType } from '@/shared/lib/schedule/types';
import styles from './ScheduleCommentPanel.module.css';

export interface ScheduleCommentPanelProps {
  sourceType: ScheduleSourceType;
  sourceId: string;
  workspaceId: string;
  currentUserId: string | undefined;
}

// 결혼/임신/연애 일정 상세 패널에 공통으로 꽂는 댓글 섹션 — RecordDetailModal의 댓글 UI 패턴을
// 그대로 따르되, 기록용 comment 테이블이 아니라 schedule_comment를 쓴다(0016_schedule_ack.sql).
export function ScheduleCommentPanel({ sourceType, sourceId, workspaceId, currentUserId }: ScheduleCommentPanelProps) {
  const { data: comments } = useScheduleComments(sourceType, sourceId);
  const addComment = useAddScheduleComment(sourceType, sourceId);
  const deleteComment = useDeleteScheduleComment(sourceType, sourceId);
  const [draft, setDraft] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !currentUserId) return;
    addComment.mutate(
      { sourceType, sourceId, workspaceId, authorId: currentUserId, body: draft.trim() },
      { onSuccess: () => setDraft('') },
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>댓글 {comments?.length ?? 0}</p>
      {(comments ?? []).map((comment) => (
        <div key={comment.id} className={styles.comment}>
          <span className={styles.author}>{comment.authorName}</span>
          <span className={styles.body}>{comment.body}</span>
          {comment.authorId === currentUserId && (
            <button type="button" className={styles.delete} onClick={() => deleteComment.mutate(comment.id)} aria-label="댓글 삭제">
              ✕
            </button>
          )}
        </div>
      ))}
      {(comments ?? []).length === 0 && <p className={styles.empty}>아직 댓글이 없어요.</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          placeholder="댓글을 남겨보세요"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className={styles.submit} disabled={!draft.trim()}>
          등록
        </button>
      </form>
    </div>
  );
}
