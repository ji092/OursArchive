import { createClient } from '@supabase/supabase-js';

// anon key는 RLS로 접근이 제한되므로 클라이언트에 노출돼도 안전하다 (PHASE6/CLAUDE.md 보안 규칙).
// service role key 등 서버 전용 키는 이 파일에도, 어떤 프론트 코드에도 절대 들어오지 않는다.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
