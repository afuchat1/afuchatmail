import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject: string;
  body_html: string;
  body_text: string;
  reply_to?: string;
  thread_id?: string;
  in_reply_to?: string;
  attachments?: Array<{
    name: string;
    size: number;
    path: string;
  }>;
}

const RESEND_API = "https://api.resend.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

async function resendFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Ensure the custom domain exists at the email provider and is verified, so
 * outgoing mail can carry the user's own address in the From header.
 * Returns { verified } — false means we must relay through the platform domain.
 */
async function ensureProviderSendingDomain(
  domain: string,
  existingId: string | null,
): Promise<{ id: string | null; status?: string; verified: boolean }> {
  const isVerified = (s?: string) => String(s ?? "").toLowerCase() === "verified";

  const inspect = async (id: string) => {
    const got = await resendFetch(`/domains/${id}`);
    if (!got.ok || !got.body) return null;
    return { id: got.body.id ?? id, status: got.body.status as string | undefined };
  };

  let current = existingId ? await inspect(existingId) : null;

  if (!current) {
    const list = await resendFetch("/domains");
    const arr: any[] = list.ok ? (list.body?.data ?? list.body ?? []) : [];
    const match = arr.find((d: any) => String(d?.name).toLowerCase() === domain.toLowerCase());
    if (match?.id) current = await inspect(match.id);
  }

  if (!current) {
    const created = await resendFetch("/domains", {
      method: "POST",
      body: JSON.stringify({ name: domain, region: "us-east-1" }),
    });
    if (!created.ok) {
      // Plan capacity or other provider refusal — relay path will be used.
      return { id: existingId, status: created.status === 403 ? "limit_reached" : "provider_error", verified: false };
    }
    current = { id: created.body?.id, status: created.body?.status };
  }

  if (current?.id && !isVerified(current.status)) {
    await resendFetch(`/domains/${current.id}/verify`, { method: "POST" });
    const fresh = await inspect(current.id);
    if (fresh) current = fresh;
  }

  return { id: current?.id ?? existingId, status: current?.status, verified: isVerified(current?.status) };
}


const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Extract JWT token
    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the JWT token and get user data
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error(`Authentication failed: ${userError?.message || "Invalid token"}`);
    }

    console.log("Authenticated user:", user.id);


    const emailData: SendEmailRequest = await req.json();
    console.log("Sending email from:", emailData.from_address, "to:", emailData.to_addresses);

    // ── Plan-aware attachment storage quota enforcement ─────────────────
    const incomingBytes = (emailData.attachments || []).reduce(
      (acc, a) => acc + (Number(a.size) || 0),
      0,
    );
    if (incomingBytes > 0) {
      const [{ data: usedData }, { data: quotaData }] = await Promise.all([
        supabaseAdmin.rpc("get_user_storage_used_bytes", { _user_id: user.id }),
        supabaseAdmin.rpc("get_user_storage_quota_bytes", { _user_id: user.id }),
      ]);
      const usedBytes = Number(usedData) || 0;
      const quotaBytes = Number(quotaData);
      // -1 sentinel = unlimited (admins).
      if (Number.isFinite(quotaBytes) && quotaBytes >= 0 && usedBytes + incomingBytes > quotaBytes) {
        console.warn("Storage quota exceeded for user", user.id, {
          usedBytes, incomingBytes, quotaBytes,
        });
        return new Response(
          JSON.stringify({
            error: "Attachment storage quota exceeded for your current plan. Upgrade or delete old attachments and try again.",
            code: "STORAGE_QUOTA_EXCEEDED",
            used_bytes: usedBytes,
            incoming_bytes: incomingBytes,
            quota_bytes: quotaBytes,
          }),
          { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    // Validate sender: must own the from_address, and its domain must be
    // either the platform domain (afuchat.com) or a verified custom domain.
    const fromLower = String(emailData.from_address || "").toLowerCase().trim();
    const fromDomain = fromLower.split("@")[1] || "";
    const { data: ownedAddr } = await supabaseAdmin
      .from("email_addresses")
      .select("id, domain")
      .eq("full_email", fromLower)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ownedAddr) {
      return new Response(
        JSON.stringify({
          error: `You do not own the address ${fromLower}. Add it under Settings → Email Addresses first.`,
          code: "FROM_NOT_OWNED",
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    let providerDomainReady = fromDomain === "afuchat.com";
    if (fromDomain !== "afuchat.com") {
      const { data: cd } = await supabaseAdmin
        .from("custom_domains")
        .select("id, status, resend_domain_id")
        .eq("user_id", user.id)
        .eq("domain", fromDomain)
        .maybeSingle();
      if (!cd || cd.status !== "verified") {
        return new Response(
          JSON.stringify({
            error: `Custom domain ${fromDomain} is not verified yet. Open Settings → Custom Domains, verify DNS, then try again.`,
            code: "DOMAIN_NOT_VERIFIED",
          }),
          { status: 412, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      // Make the provider aware of the domain so mail can leave WITH the
      // custom address in the From header (no platform domain visible).
      // Registration/verification is attempted on every send until it sticks;
      // if the provider cannot host the domain (plan capacity), we fall back
      // to the platform relay purely as a delivery path.
      try {
        const ensured = await ensureProviderSendingDomain(fromDomain, cd.resend_domain_id ?? null);
        providerDomainReady = ensured.verified;
        if (ensured.id && ensured.id !== cd.resend_domain_id) {
          await supabaseAdmin
            .from("custom_domains")
            .update({ resend_domain_id: ensured.id, provider_status: ensured.status ?? null })
            .eq("id", cd.id);
        } else if (ensured.status) {
          await supabaseAdmin
            .from("custom_domains")
            .update({ provider_status: ensured.status })
            .eq("id", cd.id);
        }
      } catch (err) {
        console.warn("Provider sending-domain setup unavailable:", (err as Error)?.message);
      }
    }


    // Send email via Resend.
    // Custom domains may not be registered as sending domains with the email
    // provider (provider-side domain capacity). In that case we relay the
    // message through the platform sending domain while preserving the user's
    // custom address as the display name and Reply-To, so replies come back
    // to their custom mailbox.
    const RELAY_SENDER = "relay@afuchat.com";
    const doSend = (from: string, replyTo?: string) =>
      resend.emails.send({
        from,
        to: emailData.to_addresses,
        cc: emailData.cc_addresses,
        bcc: emailData.bcc_addresses,
        subject: emailData.subject,
        html: emailData.body_html,
        text: emailData.body_text,
        replyTo: replyTo || emailData.reply_to,
      });

    let relayed = false;
    let emailResponse: any = await doSend(emailData.from_address);

    const provErr0 = (emailResponse as any)?.error;
    // Any provider rejection for a custom-domain sender is retried through the
    // platform relay — a custom domain that is verified in AfuChat must always
    // be able to send, whether or not the provider hosts it as a sending domain.
    const needsRelay = !!provErr0 && fromDomain !== "afuchat.com";

    if (needsRelay) {
      console.warn("Relaying custom-domain send through platform domain:", {
        fromDomain,
        providerError: provErr0?.message,
      });
      relayed = true;
      emailResponse = await doSend(
        `${fromLower} <${RELAY_SENDER}>`,
        emailData.reply_to || fromLower,
      );
    }

    if ((emailResponse as any)?.error) {
      const provErr = (emailResponse as any).error;
      console.error("Resend rejected send:", provErr);
      return new Response(
        JSON.stringify({
          error: provErr?.message || "Email provider rejected the message",
          code: provErr?.name || "PROVIDER_ERROR",
          provider_status: provErr?.statusCode,
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }


    console.log("Email sent successfully:", emailResponse);

    // Get the email_address_id
    const { data: emailAddress } = await supabaseAdmin
      .from("email_addresses")
      .select("id")
      .eq("full_email", emailData.from_address)
      .eq("user_id", user.id)
      .single();

    // Get the Sent folder for this user
    const { data: sentFolder } = await supabaseAdmin
      .from("folders")
      .select("id")
      .eq("type", "sent")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("Sent folder:", sentFolder);
    console.log("Email address:", emailAddress);

    // Determine thread_id for threading
    let finalThreadId = emailData.thread_id;
    
    // If this is a reply (has in_reply_to) but no thread_id, fetch the original email
    if (emailData.in_reply_to && !finalThreadId) {
      const { data: originalEmail } = await supabaseAdmin
        .from("emails")
        .select("id, thread_id")
        .eq("id", emailData.in_reply_to)
        .eq("user_id", user.id)
        .single();
      
      if (originalEmail) {
        // Use existing thread_id or create new one from original email's id
        finalThreadId = originalEmail.thread_id || originalEmail.id;
        
        // If original email doesn't have thread_id, update it
        if (!originalEmail.thread_id) {
          await supabaseAdmin
            .from("emails")
            .update({ thread_id: finalThreadId })
            .eq("id", originalEmail.id);
        }
      }
    }

    // Store in database using admin client with explicit user_id
    const { data: insertedEmail, error: insertError } = await supabaseAdmin
      .from("emails")
      .insert({
        user_id: user.id,
        email_address_id: emailAddress?.id,
        folder_id: sentFolder?.id,
        from_address: emailData.from_address,
        to_addresses: emailData.to_addresses,
        cc_addresses: emailData.cc_addresses || [],
        bcc_addresses: emailData.bcc_addresses || [],
        subject: emailData.subject,
        body_html: emailData.body_html,
        body_text: emailData.body_text,
        reply_to: emailData.reply_to,
        attachments: emailData.attachments || [],
        sent_at: new Date().toISOString(),
        is_read: true,
        thread_id: finalThreadId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing email in database:", insertError);
      throw new Error(`Failed to store email: ${insertError.message}`);
    }

    console.log("Email stored successfully:", insertedEmail?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      relayed,
      email_sent: emailResponse,
      email_stored: insertedEmail 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to send email",
        code: "EMAIL_SEND_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
