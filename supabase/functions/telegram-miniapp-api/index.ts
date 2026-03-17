import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const { user_id, action } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── GET EMAILS ──
    if (action === "get_emails") {
      const { folder_type, limit: lim, offset } = await parseBody(req, { folder_type: "inbox", limit: 20, offset: 0 });
      
      const body = await req.json().catch(() => ({}));
      const folderType = body.folder_type || "inbox";
      const emailLimit = Math.min(body.limit || 20, 50);
      const emailOffset = body.offset || 0;

      const { data: folder } = await supabaseAdmin
        .from("folders").select("id").eq("user_id", user_id).eq("type", folderType).single();

      if (!folder) {
        return json({ emails: [], total: 0 });
      }

      let query = supabaseAdmin
        .from("emails")
        .select("id, from_address, to_addresses, subject, body_text, body_html, is_read, is_starred, is_important, received_at, sent_at, created_at, attachments", { count: "exact" })
        .eq("user_id", user_id)
        .eq("folder_id", folder.id)
        .is("deleted_at", null)
        .order("received_at", { ascending: false, nullsFirst: false })
        .range(emailOffset, emailOffset + emailLimit - 1);

      const { data: emails, count } = await query;

      return json({ emails: emails || [], total: count || 0 });
    }

    // ── READ EMAIL ──
    if (action === "read_email") {
      const body = await req.json().catch(() => ({}));
      const emailId = body.email_id;

      const { data: email } = await supabaseAdmin
        .from("emails").select("*").eq("id", emailId).eq("user_id", user_id).single();

      if (!email) return json({ error: "Not found" }, 404);

      // Mark read
      await supabaseAdmin.from("emails").update({ is_read: true }).eq("id", emailId);

      return json({ email });
    }

    // ── TOGGLE STAR ──
    if (action === "toggle_star") {
      const body = await req.json().catch(() => ({}));
      const { data: email } = await supabaseAdmin
        .from("emails").select("id, is_starred").eq("id", body.email_id).eq("user_id", user_id).single();
      if (!email) return json({ error: "Not found" }, 404);

      await supabaseAdmin.from("emails").update({ is_starred: !email.is_starred }).eq("id", email.id);
      return json({ is_starred: !email.is_starred });
    }

    // ── DELETE (move to trash) ──
    if (action === "delete_email") {
      const body = await req.json().catch(() => ({}));
      const { data: trash } = await supabaseAdmin
        .from("folders").select("id").eq("user_id", user_id).eq("type", "trash").single();

      if (trash) {
        await supabaseAdmin.from("emails")
          .update({ folder_id: trash.id, deleted_at: new Date().toISOString() })
          .eq("id", body.email_id).eq("user_id", user_id);
      }
      return json({ ok: true });
    }

    // ── MARK READ/UNREAD ──
    if (action === "toggle_read") {
      const body = await req.json().catch(() => ({}));
      const { data: email } = await supabaseAdmin
        .from("emails").select("id, is_read").eq("id", body.email_id).eq("user_id", user_id).single();
      if (!email) return json({ error: "Not found" }, 404);

      await supabaseAdmin.from("emails").update({ is_read: !email.is_read }).eq("id", email.id);
      return json({ is_read: !email.is_read });
    }

    // ── SEND EMAIL ──
    if (action === "send_email") {
      const body = await req.json().catch(() => ({}));
      const { to, subject, text, html } = body;

      const { data: fromAddr } = await supabaseAdmin
        .from("email_addresses").select("full_email, id").eq("user_id", user_id).eq("is_primary", true).single();
      if (!fromAddr) return json({ error: "No email address" }, 400);

      const { data: sentFolder } = await supabaseAdmin
        .from("folders").select("id").eq("user_id", user_id).eq("type", "sent").single();

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          from: fromAddr.full_email, to: Array.isArray(to) ? to : [to], subject,
          html: html || `<p>${(text || "").replace(/\n/g, "<br>")}</p>`,
          text: text || "", user_id, email_address_id: fromAddr.id, folder_id: sentFolder?.id,
        }),
      });

      if (res.ok) return json({ ok: true, from: fromAddr.full_email });
      const err = await res.text();
      console.error("Send failed:", err);
      return json({ error: "Send failed" }, 500);
    }

    // ── UNREAD COUNT ──
    if (action === "unread_count") {
      const { count } = await supabaseAdmin
        .from("emails").select("*", { count: "exact", head: true })
        .eq("user_id", user_id).eq("is_read", false).is("deleted_at", null);
      return json({ count: count || 0 });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("Miniapp API error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" },
  });
}

async function parseBody(_req: Request, _defaults: Record<string, unknown>) {
  return _defaults;
}
