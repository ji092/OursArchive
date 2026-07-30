import { supabase } from '@/shared/lib/api/supabaseClient';
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
