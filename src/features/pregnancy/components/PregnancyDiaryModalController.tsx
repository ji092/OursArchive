import { useSearchParams } from 'react-router-dom';
import { RecordDetailModal } from '@/shared/components/record/RecordDetailModal';
import { CURRENT_AUTHOR_NAME } from '@/features/love/mockAuth';
import { useAddDiaryComment, useDeleteDiaryComment, useDiaries } from '../hooks/usePregnancyData';

function formatRecordedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function PregnancyDiaryModalController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const diaryId = searchParams.get('record');
  const { data: diaries } = useDiaries();
  const addComment = useAddDiaryComment();
  const deleteComment = useDeleteDiaryComment();

  const diary = diaries?.find((d) => d.id === diaryId);
  if (!diary) return null;

  return (
    <RecordDetailModal
      authorName={`${diary.weekNo}주차 성장 일기`}
      recordedAtLabel={formatRecordedAt(diary.recordedAt)}
      body={diary.title + '\n\n' + diary.body}
      photos={[{ gradient: diary.gradient }]}
      comments={diary.comments}
      onClose={() => setSearchParams({})}
      currentAuthorName={CURRENT_AUTHOR_NAME}
      onAddComment={(body) => addComment.mutate({ diaryId: diary.id, authorName: CURRENT_AUTHOR_NAME, body })}
      onDeleteComment={(commentId) => deleteComment.mutate({ diaryId: diary.id, commentId })}
    />
  );
}
