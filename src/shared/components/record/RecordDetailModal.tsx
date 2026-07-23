import { useEffect, useState, type FormEvent } from 'react';
import { RecordThumbnail } from './RecordThumbnail';
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
  photos: { gradient: string }[];
  comments: RecordDetailModalComment[];
  onClose: () => void;
  currentAuthorName?: string;
  onAddComment?: (body: string) => void;
  onDeleteComment?: (commentId: string) => void;
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
}: RecordDetailModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const hasMultiplePhotos = photos.length > 1;

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

        {photos.length > 0 && (
          <div className={styles.photoArea}>
            <RecordThumbnail gradient={photos[photoIndex].gradient} alt={`${authorName}의 기록 사진`} />
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
