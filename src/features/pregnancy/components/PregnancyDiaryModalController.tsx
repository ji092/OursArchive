import { useSearchParams } from 'react-router-dom';
import { RecordDetailModal } from '@/shared/components/record/RecordDetailModal';
import { useMyProfile } from '@/features/mypage/hooks/useProfile';
import { useCurrentWorkspaceId, useSession } from '@/shared/hooks/useAuth';
import { useAddDiaryComment, useDeleteDiaryComment, useDiaries } from '../hooks/usePregnancyData';

function formatRecordedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function PregnancyDiaryModalController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const diaryId = searchParams.get('record');
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const currentAuthorName = profile?.nickname ?? '나';
  const workspaceId = useCurrentWorkspaceId();
  const { data: diaries } = useDiaries(workspaceId);
  const addComment = useAddDiaryComment(workspaceId);
  const deleteComment = useDeleteDiaryComment(workspaceId);

  const diary = diaries?.find((d) => d.id === diaryId);
  if (!diary) return null;

  return (
    <RecordDetailModal
      authorName={`${diary.weekNo}주차 성장 일기`}
      recordedAtLabel={formatRecordedAt(diary.recordedAt)}
      body={diary.title + '\n\n' + diary.body}
      photos={[{ gradient: diary.gradient, imageUrl: diary.imageUrl }]}
      comments={diary.comments}
      onClose={() => setSearchParams({})}
      currentAuthorName={currentAuthorName}
      onAddComment={(body) => userId && addComment.mutate({ diaryId: diary.id, authorId: userId, body })}
      onDeleteComment={(commentId) => deleteComment.mutate(commentId)}
    />
  );
}
