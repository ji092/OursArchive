import { useNavigate, useSearchParams } from 'react-router-dom';
import { RecordDetailModal } from '@/shared/components/record/RecordDetailModal';
import { useMyProfile } from '@/features/mypage/hooks/useProfile';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useDeleteLoveRecord } from '../hooks/useCreateLoveRecord';
import { useAddLoveComment, useDeleteLoveComment } from '../hooks/useLoveComments';
import { useLoveRecords } from '../hooks/useLoveRecords';

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
  const navigate = useNavigate();
  const recordId = searchParams.get('record');
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: membership } = useMyMembership(userId);
  const { data: profile } = useMyProfile(userId);
  const currentAuthorName = profile?.nickname ?? '나';
  const { data: records } = useLoveRecords(membership?.workspaceId);
  const addComment = useAddLoveComment(membership?.workspaceId);
  const deleteComment = useDeleteLoveComment(membership?.workspaceId);
  const deleteRecord = useDeleteLoveRecord(membership?.workspaceId);

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
      currentAuthorName={currentAuthorName}
      onAddComment={(body) => userId && addComment.mutate({ recordId: activeRecord.id, authorId: userId, body })}
      onDeleteComment={(commentId) => deleteComment.mutate(commentId)}
      onEdit={() => navigate(`/love/create?edit=${activeRecord.id}`)}
      onDelete={() => deleteRecord.mutate(activeRecord.id, { onSuccess: () => setSearchParams({}) })}
    />
  );
}
