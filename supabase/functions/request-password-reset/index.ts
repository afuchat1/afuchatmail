import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash the raw token (SHA-256) so the DB never stores the recoverable value.
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const recoveryEmail = String(body.recovery_email || "").trim().toLowerCase();
    const origin = String(body.origin || "").replace(/\/+$/, "");

    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      return new Response(
        JSON.stringify({ error: "A valid recovery email is required." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Look up the address record for the recovery email.
    const { data: addr } = await supabaseAdmin
      .from("email_addresses")
      .select("id, user_id, full_email")
      .eq("full_email", recoveryEmail)
      .maybeSingle();

    // Uniform response: never leak whether the recovery email exists or is
    // registered as a recovery for anyone. Always say "if it matches, we sent it".
    const UNIFORM_OK = new Response(
      JSON.stringify({
        ok: true,
        message:
          "If that address is registered as a recovery for an AfuChat account, a reset link has been delivered to its inbox.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );

    if (!addr) return UNIFORM_OK;

    // Find every profile that uses this address as recovery.
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("recovery_email_address_id", addr.id);

    if (!profiles || profiles.length === 0) return UNIFORM_OK;

    // Find the recovery recipient's inbox folder (to store the message).
    const { data: recipInboxFolder } = await supabaseAdmin
      .from("folders")
      .select("id")
      .eq("user_id", addr.user_id)
      .eq("type", "inbox")
      .maybeSingle();

    const baseUrl = origin || Deno.env.get("APP_BASE_URL") || "https://email.afuchat.com";

    // Rate-limit: at most 3 active requests per user per hour.
    for (const p of profiles) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("password_reset_tokens")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id)
        .gte("created_at", oneHourAgo);

      if ((count ?? 0) >= 3) {
        console.warn("Reset rate limit hit for user", p.id);
        continue;
      }

      const rawToken = randomToken();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      const { error: insertErr } = await supabaseAdmin
        .from("password_reset_tokens")
        .insert({
          user_id: p.id,
          token_hash: tokenHash,
          recovery_email: recoveryEmail,
          expires_at: expiresAt,
          ip: req.headers.get("x-forwarded-for") || null,
          user_agent: req.headers.get("user-agent") || null,
        });

      if (insertErr) {
        console.error("Failed to store reset token:", insertErr);
        continue;
      }

      // Look up the *requesting* account's primary address for display context.
      const { data: primary } = await supabaseAdmin
        .from("email_addresses")
        .select("full_email")
        .eq("user_id", p.id)
        .eq("is_primary", true)
        .maybeSingle();

      const targetLabel = primary?.full_email ?? "an AfuChat Mail account";
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      const subject = `Password reset request for ${targetLabel}`;
      const bodyText = [
        `Hi,`,
        ``,
        `Someone (hopefully you) requested a password reset for ${targetLabel}.`,
        `This request was sent because your address (${recoveryEmail}) is set as the recovery email for that account.`,
        ``,
        `To reset the password, open this link within 60 minutes:`,
        resetUrl,
        ``,
        `If you did not expect this request, you can safely ignore this email — the password will not change.`,
        ``,
        `— AfuChat Mail Security`,
      ].join("\n");

      const bodyHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <h2 style="margin:0 0 12px">Password reset request</h2>
  <p style="margin:0 0 12px;color:#334155">
    Someone requested a password reset for <strong>${targetLabel}</strong>.
    This request was delivered here because your address
    <strong>${recoveryEmail}</strong> is set as the recovery email for that account.
  </p>
  <p style="margin:24px 0">
    <a href="${resetUrl}"
       style="background:#0052ff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">
      Reset password
    </a>
  </p>
  <p style="margin:0 0 12px;color:#64748b;font-size:13px">
    Or paste this link into your browser:<br />
    <span style="word-break:break-all;color:#0f172a">${resetUrl}</span>
  </p>
  <p style="margin:24px 0 0;color:#64748b;font-size:13px">
    This link expires in 60 minutes and can be used only once.
    If you didn't expect this request, you can safely ignore this email —
    the password will not change.
  </p>
  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">— AfuChat Mail Security</p>
</div>`;

      // Deliver into the recovery recipient's AfuChat inbox as an internal message.
      const { error: mailErr } = await supabaseAdmin.from("emails").insert({
        user_id: addr.user_id,
        email_address_id: addr.id,
        folder_id: recipInboxFolder?.id ?? null,
        from_address: "security@afuchat.com",
        to_addresses: [recoveryEmail],
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        is_read: false,
        is_important: true,
        received_at: new Date().toISOString(),
      });

      if (mailErr) {
        console.error("Failed to deliver reset email:", mailErr);
      }
    }

    return UNIFORM_OK;
  } catch (err: any) {
    console.error("request-password-reset error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
