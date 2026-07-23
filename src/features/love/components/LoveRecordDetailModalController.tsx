import { useSearchParams } from 'react-router-dom';
import { RecordDetailModal } from '@/shared/components/record/RecordDetailModal';
import { useAddLoveComment, useDeleteLoveComment } from '../hooks/useLoveComments';
import { useLoveRecords } from '../hooks/useLoveRecords';
import { CURRENT_AUTHOR_NAME } from '../mockAuth';

// 피드/달력/지도 뷰가 모두 ?record=<id> 딥링크로 같은 상세를 열므로(패턴 A, 11.3), 그 연결 로직을
// 한 곳에 모아 각 뷰 컴포넌트에서 중복하지 않는다. 뷰 하나당 이 컴포넌트를 한 번만 렌더링하면 된다.
function formatRecordedAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function LoveRecordDetailModalController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const recordId = searchParams.get('record');
  const { data: records } = useLoveRecords();
  const addComment = useAddLoveComment();
  const deleteComment = useDeleteLoveComment();

  const activeRecord = records?.find((record) => record.id === recordId);
  if (!activeRecord) return null;

  return (
    <RecordDetailModal
      authorName={activeRecord.authorName}
      placeName={activeRecord.placeName}
      recordedAtLabel={formatRecordedAt(activeRecord.recordedAt)}
      body={activeRecord.body}
      photos={activeRecord.photos}
      comments={activeRecord.comments}
      onClose={() => setSearchParams({})}
      currentAuthorName={CURRENT_AUTHOR_NAME}
      onAddComment={(body) => addComment.mutate({ recordId: activeRecord.id, authorName: CURRENT_AUTHOR_NAME, body })}
      onDeleteComment={(commentId) => deleteComment.mutate({ recordId: activeRecord.id, commentId })}
    />
  );
}
