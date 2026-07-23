// POST /invites/:token/accept (요구사항 6.1, 7.4) — 초대 대상이 링크를 열어 이름·비밀번호를 직접 설정한다.
// Supabase 기본 초대(admin.inviteUserByEmail)는 초대 즉시 계정을 만들어버려 "본인이 승낙 시점에
// 비밀번호를 설정"하는 7.4와 맞지 않는다 — 그래서 계정 생성은 이 함수(토큰 검증 통과 시점)에서만 일어난다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, sha256Hex } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => null);
  const token = body?.token;
  const name = typeof body?.name === "string" ? body.name.trim() : null;
  const password = body?.password;
  if (!token || !name || typeof password !== "string") {
    return jsonResponse({ error: "invalid_body" }, 422);
  }
  if (password.length < 8) return jsonResponse({ error: "weak_password" }, 422);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const tokenHash = await sha256Hex(token);

  const { data: invite } = await admin
    .from("invite_token")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!invite) return jsonResponse({ error: "invalid_token" }, 404);
  if (invite.status !== "active") return jsonResponse({ error: "invite_already_used_or_revoked" }, 410);
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await admin.from("invite_token").update({ status: "expired" }).eq("id", invite.id);
    return jsonResponse({ error: "invite_expired" }, 410);
  }

  // 이메일 바인딩(7.4): 요청 바디의 이메일이 아니라 토큰이 가리키는 invite.email을 신뢰 소스로 쓴다
  // — 클라이언트가 다른 이메일을 보내도 우회할 수 없다.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    // 이미 가입된 이메일 등 구체적 사유는 노출하지 않는다 (7.6과 동일한 계정 탐색 방지 원칙).
    return jsonResponse({ error: "account_creation_failed" }, 400);
  }

  await admin.from("profiles").update({ name }).eq("id", created.user.id);

  const { error: membershipError } = await admin.from("membership").insert({
    workspace_id: invite.workspace_id,
    user_id: created.user.id,
    role: invite.role,
    status: "pending", // Master의 최종 승인(PATCH /members/:id/approve) 전까지는 pending
    invited_by: invite.created_by,
    invited_at: invite.created_at,
  });
  if (membershipError) {
    await admin.auth.admin.deleteUser(created.user.id); // 부분 실패 롤백 — 계정만 남고 멤버십이 없는 상태 방지
    return jsonResponse({ error: "membership_failed" }, 500);
  }

  await admin
    .from("invite_token")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", invite.id);

  await admin.from("audit_log").insert({
    workspace_id: invite.workspace_id,
    actor_id: created.user.id,
    action: "invite_accepted",
    target: invite.email,
  });

  // 계정 생성 직후 바로 로그인 상태로 넘어가도록 세션을 함께 발급한다 (승인 전이라도 본인 상태 확인은 가능).
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
    email: invite.email,
    password,
  });

  return jsonResponse(
    {
      status: "account_created_pending_approval",
      session: signInError ? null : signIn.session,
    },
    201,
  );
});
