import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function sendTelegramMessage(chatId: number, text: string, parseMode = "HTML") {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
  return res.json();
}

async function handleStart(chatId: number, username?: string) {
  // Generate a unique link code
  const linkCode = crypto.randomUUID().slice(0, 8);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  // Check if already linked
  const { data: existing } = await supabaseAdmin
    .from("telegram_links")
    .select("id, user_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (existing) {
    await sendTelegramMessage(chatId,
      `✅ <b>You're already linked to AfuChat!</b>\n\nUse /inbox to check your emails.\nUse /help for all commands.`
    );
    return;
  }

  // Store pending link code (no user_id yet, will be claimed via web)
  // We use a special approach: store with a placeholder, web UI will claim it
  await supabaseAdmin
    .from("telegram_links")
    .upsert({
      chat_id: chatId,
      telegram_username: username || null,
      link_code: linkCode,
      link_code_expires_at: expiresAt,
      user_id: "00000000-0000-0000-0000-000000000000", // placeholder
    }, { onConflict: "chat_id" });

  await sendTelegramMessage(chatId,
    `👋 <b>Welcome to AfuChat Mail Bot!</b>\n\n` +
    `To link your account, go to your AfuChat Settings and enter this code:\n\n` +
    `🔑 <code>${linkCode}</code>\n\n` +
    `This code expires in 10 minutes.\n\n` +
    `Or visit: https://afuchatmail.lovable.app/settings`
  );
}

async function handleInbox(chatId: number) {
  const { data: link } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .neq("user_id", "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!link) {
    await sendTelegramMessage(chatId, "❌ Account not linked. Use /start to get a link code.");
    return;
  }

  // Get inbox folder
  const { data: inboxFolder } = await supabaseAdmin
    .from("folders")
    .select("id")
    .eq("user_id", link.user_id)
    .eq("type", "inbox")
    .single();

  if (!inboxFolder) {
    await sendTelegramMessage(chatId, "No inbox found.");
    return;
  }

  // Get latest 10 unread emails
  const { data: emails } = await supabaseAdmin
    .from("emails")
    .select("id, from_address, subject, received_at, is_read")
    .eq("user_id", link.user_id)
    .eq("folder_id", inboxFolder.id)
    .is("deleted_at", null)
    .order("received_at", { ascending: false })
    .limit(10);

  if (!emails || emails.length === 0) {
    await sendTelegramMessage(chatId, "📭 Your inbox is empty!");
    return;
  }

  let msg = "📬 <b>Your Latest Emails:</b>\n\n";
  emails.forEach((e, i) => {
    const status = e.is_read ? "📖" : "📩";
    const date = new Date(e.received_at).toLocaleDateString();
    msg += `${status} <b>${i + 1}.</b> ${escapeHtml(e.subject || "(No subject)")}\n`;
    msg += `   From: ${escapeHtml(e.from_address)}\n`;
    msg += `   ${date}\n`;
    msg += `   /read_${i + 1}\n\n`;
  });

  // Store email IDs in context for /read_ commands
  await supabaseAdmin
    .from("telegram_links")
    .update({ link_code: JSON.stringify(emails.map(e => e.id)) })
    .eq("chat_id", chatId);

  await sendTelegramMessage(chatId, msg);
}

async function handleRead(chatId: number, index: number) {
  const { data: link } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id, link_code")
    .eq("chat_id", chatId)
    .neq("user_id", "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!link) {
    await sendTelegramMessage(chatId, "❌ Account not linked. Use /start first.");
    return;
  }

  let emailIds: string[];
  try {
    emailIds = JSON.parse(link.link_code || "[]");
  } catch {
    await sendTelegramMessage(chatId, "Use /inbox first to load your emails.");
    return;
  }

  if (index < 0 || index >= emailIds.length) {
    await sendTelegramMessage(chatId, "Invalid email number. Use /inbox to refresh.");
    return;
  }

  const { data: email } = await supabaseAdmin
    .from("emails")
    .select("*")
    .eq("id", emailIds[index])
    .eq("user_id", link.user_id)
    .single();

  if (!email) {
    await sendTelegramMessage(chatId, "Email not found.");
    return;
  }

  // Mark as read
  await supabaseAdmin
    .from("emails")
    .update({ is_read: true })
    .eq("id", email.id);

  const body = email.body_text || stripHtml(email.body_html || "") || "(No content)";
  const truncated = body.length > 2000 ? body.substring(0, 2000) + "..." : body;

  let msg = `📧 <b>${escapeHtml(email.subject)}</b>\n\n`;
  msg += `From: ${escapeHtml(email.from_address)}\n`;
  msg += `To: ${escapeHtml((email.to_addresses || []).join(", "))}\n`;
  msg += `Date: ${new Date(email.received_at || email.created_at).toLocaleString()}\n\n`;
  msg += `${escapeHtml(truncated)}\n\n`;
  msg += `Reply: /reply_${index + 1}`;

  await sendTelegramMessage(chatId, msg);
}

async function handleSend(chatId: number, text: string) {
  const { data: link } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .neq("user_id", "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!link) {
    await sendTelegramMessage(chatId, "❌ Account not linked. Use /start first.");
    return;
  }

  // Parse: /send to@email.com | Subject | Body
  const parts = text.replace(/^\/send\s+/i, "").split("|").map(s => s.trim());
  if (parts.length < 3) {
    await sendTelegramMessage(chatId,
      "📝 <b>Send email format:</b>\n\n<code>/send recipient@email.com | Subject | Your message body</code>"
    );
    return;
  }

  const [to, subject, ...bodyParts] = parts;
  const body = bodyParts.join("|");

  // Get user's primary email address
  const { data: fromAddr } = await supabaseAdmin
    .from("email_addresses")
    .select("full_email, id")
    .eq("user_id", link.user_id)
    .eq("is_primary", true)
    .single();

  if (!fromAddr) {
    await sendTelegramMessage(chatId, "No email address found on your account.");
    return;
  }

  // Get sent folder
  const { data: sentFolder } = await supabaseAdmin
    .from("folders")
    .select("id")
    .eq("user_id", link.user_id)
    .eq("type", "sent")
    .single();

  // Call send-email edge function
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      from: fromAddr.full_email,
      to: [to],
      subject,
      html: `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`,
      text: body,
      user_id: link.user_id,
      email_address_id: fromAddr.id,
      folder_id: sentFolder?.id,
    }),
  });

  if (sendRes.ok) {
    await sendTelegramMessage(chatId, `✅ Email sent to <b>${escapeHtml(to)}</b>!`);
  } else {
    const err = await sendRes.text();
    console.error("Send email failed:", err);
    await sendTelegramMessage(chatId, "❌ Failed to send email. Please try again.");
  }
}

async function handleHelp(chatId: number) {
  await sendTelegramMessage(chatId,
    `📬 <b>AfuChat Mail Bot Commands:</b>\n\n` +
    `/start - Link your AfuChat account\n` +
    `/inbox - View latest emails\n` +
    `/read_1 - Read email #1 from inbox\n` +
    `/send to@email.com | Subject | Body - Send an email\n` +
    `/unread - Show unread count\n` +
    `/notify_on - Enable notifications\n` +
    `/notify_off - Disable notifications\n` +
    `/unlink - Unlink your account\n` +
    `/help - Show this help`
  );
}

async function handleUnread(chatId: number) {
  const { data: link } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .neq("user_id", "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!link) {
    await sendTelegramMessage(chatId, "❌ Account not linked.");
    return;
  }

  const { count } = await supabaseAdmin
    .from("emails")
    .select("*", { count: "exact", head: true })
    .eq("user_id", link.user_id)
    .eq("is_read", false)
    .is("deleted_at", null);

  await sendTelegramMessage(chatId, `📩 You have <b>${count || 0}</b> unread emails.`);
}

async function handleNotify(chatId: number, enable: boolean) {
  await supabaseAdmin
    .from("telegram_links")
    .update({ notifications_enabled: enable })
    .eq("chat_id", chatId);

  await sendTelegramMessage(chatId,
    enable
      ? "🔔 Telegram notifications <b>enabled</b>!"
      : "🔕 Telegram notifications <b>disabled</b>."
  );
}

async function handleUnlink(chatId: number) {
  await supabaseAdmin
    .from("telegram_links")
    .delete()
    .eq("chat_id", chatId);

  await sendTelegramMessage(chatId, "✅ Account unlinked. Use /start to link again.");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Handle claim_link action from web UI
    if (body.action === "claim_link") {
      const { code, user_id } = body;
      if (!code || !user_id) {
        return new Response(JSON.stringify({ error: "Missing code or user_id" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Find pending link with this code
      const { data: pending, error: findErr } = await supabaseAdmin
        .from("telegram_links")
        .select("*")
        .eq("link_code", code)
        .eq("user_id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (findErr || !pending) {
        return new Response(JSON.stringify({ error: "Invalid or expired link code" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check expiry
      if (new Date(pending.link_code_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Link code expired. Send /start again in Telegram." }), {
          status: 410, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Claim it
      const { error: updateErr } = await supabaseAdmin
        .from("telegram_links")
        .update({ user_id: user_id, link_code: null, link_code_expires_at: null })
        .eq("id", pending.id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Notify user on Telegram
      await sendTelegramMessage(pending.chat_id, "✅ <b>Account linked!</b>\n\nYou'll now receive email notifications here.\nUse /inbox to check your emails.");

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle Telegram webhook update
    const message = body.message;
    
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const username = message.from?.username;

    if (text === "/start") {
      await handleStart(chatId, username);
    } else if (text === "/inbox") {
      await handleInbox(chatId);
    } else if (text === "/help") {
      await handleHelp(chatId);
    } else if (text === "/unread") {
      await handleUnread(chatId);
    } else if (text === "/notify_on") {
      await handleNotify(chatId, true);
    } else if (text === "/notify_off") {
      await handleNotify(chatId, false);
    } else if (text === "/unlink") {
      await handleUnlink(chatId);
    } else if (text.match(/^\/read_(\d+)$/)) {
      const idx = parseInt(text.match(/^\/read_(\d+)$/)![1]) - 1;
      await handleRead(chatId, idx);
    } else if (text.startsWith("/send ")) {
      await handleSend(chatId, text);
    } else {
      await sendTelegramMessage(chatId, "Unknown command. Use /help to see available commands.");
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Telegram bot error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
