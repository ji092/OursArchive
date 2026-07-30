// 업로드 전 클라이언트 사이드 압축/리사이즈 공용 모듈 (CLAUDE.md: 장변 2048px + WebP 변환, 챕터별 중복 구현 금지).
// R2 presigned 파이프라인이 아직 없어 지금은 마이페이지 아바타 업로드에서만 쓰이지만(2026-07-29 사용자 지정,
// 임시로 Supabase Storage 직접 업로드), love/pregnancy 사진 업로드가 R2로 전환될 때도 이 모듈을 그대로 재사용한다.
const MAX_DIMENSION = 2048;

export async function compressImageToWebp(file: File, maxDimension = MAX_DIMENSION, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context를 사용할 수 없습니다.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 변환에 실패했습니다.'))),
      'image/webp',
      quality,
    );
  });
}
