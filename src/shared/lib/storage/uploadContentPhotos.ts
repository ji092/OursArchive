import { supabase } from '@/shared/lib/api/supabaseClient';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import { compressImageToWebp } from './imageCompress';

const CONTENT_BUCKET = 'content-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// love/wedding/pregnancy 사진 업로드 공용 헬퍼. 경로 규칙은 backend/policies/0011_content_photos_storage.sql의
// RLS가 그대로 전제한다: "<workspace_id>/<table>/<record_id>/<n>.webp" — 첫 세그먼트(workspace_id)로
// can_access_couple_content를 판정하므로 이 규칙을 벗어난 경로로 올리면 업로드 자체가 RLS에 막힌다.
export async function uploadContentPhotos(
  workspaceId: string,
  table: string,
  recordId: string,
  files: File[],
): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImageToWebp(files[i]);
    const path = `${workspaceId}/${table}/${recordId}/${Date.now()}-${i}.webp`;
    const { error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .upload(path, compressed, { contentType: 'image/webp' });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export async function resolveContentPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(CONTENT_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const result: Record<string, string> = {};
  data.forEach((item) => {
    if (item.signedUrl && item.path) result[item.path] = item.signedUrl;
  });
  return result;
}

export async function deleteContentPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(CONTENT_BUCKET).remove(paths);
  if (error) throw error;
}

/**
 * 업로드는 끝났는데 그 사진을 가리키는 DB 행을 만들지 못했을 때 되돌린다.
 *
 * 이 보상을 하지 않으면 아무도 참조하지 않는 파일이 Storage에 영구히 남는다 —
 * 화면에는 안 보이고 용량만 늘어서 발견되지 않는다.
 * 되돌리기까지 실패하면 자동으로 정리할 방법이 없으므로 즉시 사용자에게 알린다
 * (CLAUDE.md — 되돌릴 수 없는 실패는 재시도 대상이 아니라 알림 대상).
 */
export async function rollbackUploadedPhotos(paths: string[]): Promise<void> {
  try {
    await deleteContentPhotos(paths);
  } catch (cause) {
    reportFailure('사진 일부가 서버에 남았어요. 같은 항목을 다시 저장하면 정리됩니다.', cause);
  }
}
