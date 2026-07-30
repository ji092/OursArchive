import { useEffect, useState, type FormEvent } from 'react';
import { RecordThumbnail } from './RecordThumbnail';
import { Watermark } from '@/shared/lib/capture-guard/Watermark';
import { useSession } from '@/shared/hooks/useAuth';
import styles from './RecordDetailModal.module.css';

// 패턴 A(11.3) — 진입 경로(피드/달력/지도) 무관하게 recordId 하나로 동일 상세를 렌더링한다.
// 딥링크는 ?record=<id> 쿼리 파라미터로 열고 닫는다 (CLAUDE.md) — 이 컴포넌트 자체는 라우팅을
// 모르고, 어떤 데이터를 보여줄지는 호출하는 화면(features/*)이 recordId로 조회해 props로 넘긴다.
// 댓글 작성/삭제 콜백은 선택(optional) — 아직 연결하지 않은 챕터(임신·육아)에서는 읽기 전용으로 쓸 수 있다.
export interface RecordDetailModalComment {
  id: string;
  authorName: string;
  body: string;
}

export interface RecordDetailModalProps {
  authorName: string;
  placeName?: string;
  recordedAtLabel: string;
  body: string;
  photos: { gradient: string; imageUrl?: string }[];
  comments: RecordDetailModalComment[];
  onClose: () => void;
  currentAuthorName?: string;
  onAddComment?: (body: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RecordDetailModal({
  authorName,
  placeName,
  recordedAtLabel,
  body,
  photos,
  comments,
  onClose,
  currentAuthorName,
  onAddComment,
  onDeleteComment,
  onEdit,
  onDelete,
}: RecordDetailModalProps) {
  const canManage = authorName === currentAuthorName;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const hasMultiplePhotos = photos.length > 1;
  const { session } = useSession();
  // 요구사항 11.2 — 유출 시 추적용 워터마크. 조회한 사람과 조회 시각을 남긴다(열람 시점 기준 고정,
  // 세션은 앱 상위에서 이미 로드돼 있어 마운트 시점엔 보통 채워져 있다).
  const [openedAt] = useState(() => new Date().toLocaleString('ko-KR'));
  const watermarkLabel = `${session?.user.email ?? session?.user.id ?? ''} · ${openedAt}`;

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  function handleCommentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!commentDraft.trim() || !onAddComment) return;
    onAddComment(commentDraft.trim());
    setCommentDraft('');
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        {canManage && (onEdit || onDelete) && (
          <div className={styles.manageActions}>
            {onEdit && (
              <button type="button" className={styles.manageButton} onClick={onEdit} aria-label="수정">
                ✎ 수정
              </button>
            )}
            {onDelete && (
              <button type="button" className={styles.manageButton} onClick={onDelete} aria-label="삭제">
                🗑 삭제
              </button>
            )}
          </div>
        )}

        {photos.length > 0 && (
          <div className={styles.photoArea}>
            <RecordThumbnail
              gradient={photos[photoIndex].gradient}
              imageUrl={photos[photoIndex].imageUrl}
              alt={`${authorName}의 기록 사진`}
            />
            {photos[photoIndex].imageUrl && <Watermark label={watermarkLabel} />}
            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
                  onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                  aria-label="이전 사진"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  aria-label="다음 사진"
                >
                  ›
                </button>
                <span className={styles.photoCounter}>
                  {photoIndex + 1}/{photos.length}
                </span>
              </>
            )}
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.meta}>
            <span className={styles.author}>{authorName}</span>
            {placeName && <span className={styles.place}>📍 {placeName}</span>}
            <span className={styles.date}>{recordedAtLabel}</span>
          </div>
          <p className={styles.body}>{body}</p>

          <div className={styles.comments}>
            <p className={styles.commentsTitle}>댓글 {comments.length}</p>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <span className={styles.commentAuthor}>{comment.authorName}</span>
                <span className={styles.commentBody}>{comment.body}</span>
                {onDeleteComment && comment.authorName === currentAuthorName && (
                  <button
                    type="button"
                    className={styles.commentDelete}
                    onClick={() => onDeleteComment(comment.id)}
                    aria-label="댓글 삭제"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className={styles.commentsEmpty}>아직 댓글이 없어요.</p>}

            {onAddComment && (
              <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
                <input
                  className={styles.commentInput}
                  placeholder="댓글을 남겨보세요"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                />
                <button type="submit" className={styles.commentSubmit} disabled={!commentDraft.trim()}>
                  등록
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
