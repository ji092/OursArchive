// POST /workspaces/:id/members/invite (요구사항 6.1, 7.4) — Master가 이메일+역할로 초대를 발급한다.
// 토큰 원문은 이메일로만 나가고 DB에는 SHA-256 해시만 남는다 (7.4/7.5, DB 유출 시에도 링크 복원 불가).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, sha256Hex } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL")!; // 예: https://oursarchive.app — 초대 링크 베이스

const INVITABLE_ROLES = new Set(["partner", "family", "guest"]); // master는 초대로 만들 수 없음 (1명 고정)
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function randomToken(): string {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "unauthorized" }, 401);

  // 호출자 신원 확인은 anon 키 + 요청의 JWT로 한다 (Supabase가 서명 검증을 대신 해줌).
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  const workspaceId = body?.workspace_id;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
  const role = body?.role;
  if (!workspaceId || !email || !role) return jsonResponse({ error: "invalid_body" }, 422);
  if (!INVITABLE_ROLES.has(role)) return jsonResponse({ error: "invalid_role" }, 422);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // service role은 RLS를 우회하므로, 발급 권한(master만)은 여기서 직접 재검증한다 (7.2 서버 강제 원칙).
  const { data: membership } = await admin
    .from("membership")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", callerData.user.id)
    .maybeSingle();
  if (!membership || membership.role !== "master" || membership.status !== "active") {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data: invite, error: insertError } = await admin
    .from("invite_token")
    .insert({
      workspace_id: workspaceId,
      email,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: callerData.user.id,
    })
    .select("id")
    .single();
  if (insertError || !invite) return jsonResponse({ error: "invite_failed" }, 500);

  await sendInviteEmail(email, `${APP_URL}/invite/${token}`);

  await admin.from("audit_log").insert({
    workspace_id: workspaceId,
    actor_id: callerData.user.id,
    action: "invite_sent",
    target: email,
  });

  return jsonResponse({ invite_id: invite.id, expires_at: expiresAt }, 201);
});

async function sendInviteEmail(email: string, link: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ours Archive <invite@oursarchive.app>",
      to: [email],
      subject: "Ours Archive 초대가 도착했어요",
      html: `<p>아래 링크를 눌러 24시간 안에 가입을 완료해주세요.</p><p><a href="${link}">${link}</a></p>`,
    }),
  });
  if (!res.ok) {
    // 메일 발송 실패로 초대 자체를 롤백하지 않는다 — Master가 나중에 재발송(resend)할 수 있으므로.
    console.error("resend_failed", await res.text());
  }
}
