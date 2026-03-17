import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const APP_URL = "https://email.afuchat.com";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Telegram helpers ──

async function sendTelegramMessage(chatId: number, text: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...opts }),
  });
  return res.json();
}

async function editMessageText(chatId: number, messageId: number, text: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...opts }),
  });
  return res.json();
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function inlineKeyboard(rows: { text: string; callback_data: string }[][]) {
  return { reply_markup: { inline_keyboard: rows } };
}

// ── Auth helper ──

async function getLinkedUser(chatId: number) {
  const { data } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id, link_code")
    .eq("chat_id", chatId)
    .neq("user_id", "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  return data;
}

// ── Command handlers ──

async function handleStart(chatId: number, username?: string) {
  const { data: existing } = await supabaseAdmin
    .from("telegram_links")
    .select("id, user_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (existing && existing.user_id !== "00000000-0000-0000-0000-000000000000") {
    await sendTelegramMessage(chatId,
      `✅ <b>You're already linked to AfuChat!</b>\n\nTap a button below to get started.`,
      inlineKeyboard([
        [{ text: "📬 Inbox", callback_data: "cmd_inbox" }, { text: "📩 Unread", callback_data: "cmd_unread" }],
        [{ text: "📝 Compose", callback_data: "cmd_compose" }, { text: "⚙️ Settings", callback_data: "cmd_settings" }],
        [{ text: "❓ Help", callback_data: "cmd_help" }],
      ])
    );
    return;
  }

  const linkCode = crypto.randomUUID().slice(0, 8);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from("telegram_links")
    .upsert({
      chat_id: chatId,
      telegram_username: username || null,
      link_code: linkCode,
      link_code_expires_at: expiresAt,
      user_id: "00000000-0000-0000-0000-000000000000",
    }, { onConflict: "chat_id" });

  await sendTelegramMessage(chatId,
    `👋 <b>Welcome to AfuChat Mail!</b>\n\n` +
    `Link your account by entering this code in Settings:\n\n` +
    `🔑 <code>${linkCode}</code>\n\n` +
    `⏱ Expires in 10 minutes.`,
    inlineKeyboard([
      [{ text: "🔗 Open Settings", url: `${APP_URL}/settings` } as any],
    ])
  );
}

async function handleInbox(chatId: number, editMsgId?: number) {
  const link = await getLinkedUser(chatId);
  if (!link) {
    await sendTelegramMessage(chatId, "❌ Account not linked. Use /start to get a link code.");
    return;
  }

  const { data: inboxFolder } = await supabaseAdmin
    .from("folders").select("id").eq("user_id", link.user_id).eq("type", "inbox").single();
  if (!inboxFolder) { await sendTelegramMessage(chatId, "No inbox found."); return; }

  const { data: emails } = await supabaseAdmin
    .from("emails")
    .select("id, from_address, subject, received_at, is_read, is_starred")
    .eq("user_id", link.user_id).eq("folder_id", inboxFolder.id).is("deleted_at", null)
    .order("received_at", { ascending: false }).limit(10);

  if (!emails || emails.length === 0) {
    const text = "📭 <b>Your inbox is empty!</b>\n\nNo emails to show.";
    const kb = inlineKeyboard([[{ text: "🔄 Refresh", callback_data: "cmd_inbox" }, { text: "📝 Compose", callback_data: "cmd_compose" }]]);
    if (editMsgId) await editMessageText(chatId, editMsgId, text, kb);
    else await sendTelegramMessage(chatId, text, kb);
    return;
  }

  // Store email IDs for callback reference
  await supabaseAdmin.from("telegram_links").update({ link_code: JSON.stringify(emails.map(e => e.id)) }).eq("chat_id", chatId);

  let msg = "📬 <b>Inbox</b>  —  Latest emails\n\n";
  const buttons: { text: string; callback_data: string }[][] = [];

  emails.forEach((e, i) => {
    const star = e.is_starred ? "⭐" : "";
    const read = e.is_read ? "" : "🔵 ";
    const subj = escapeHtml(e.subject || "(No subject)");
    const from = escapeHtml(e.from_address.split("@")[0]);
    const date = new Date(e.received_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    msg += `${read}<b>${i + 1}.</b> ${star} ${subj}\n    <i>${from}</i> · ${date}\n\n`;
    // Two emails per button row
    if (i % 2 === 0) buttons.push([]);
    buttons[buttons.length - 1].push({ text: `${read.trim() || "📖"} ${i + 1}`, callback_data: `read_${i}` });
  });

  buttons.push([
    { text: "🔄 Refresh", callback_data: "cmd_inbox" },
    { text: "📝 Compose", callback_data: "cmd_compose" },
  ]);

  const kb = inlineKeyboard(buttons);
  if (editMsgId) await editMessageText(chatId, editMsgId, msg, kb);
  else await sendTelegramMessage(chatId, msg, kb);
}

async function handleRead(chatId: number, index: number, editMsgId?: number) {
  const link = await getLinkedUser(chatId);
  if (!link) { await sendTelegramMessage(chatId, "❌ Account not linked."); return; }

  let emailIds: string[];
  try { emailIds = JSON.parse(link.link_code || "[]"); } catch {
    await sendTelegramMessage(chatId, "Tap 📬 Inbox first to load emails.");
    return;
  }

  if (index < 0 || index >= emailIds.length) {
    await sendTelegramMessage(chatId, "Invalid selection. Tap 📬 Inbox to refresh.");
    return;
  }

  const { data: email } = await supabaseAdmin
    .from("emails").select("*").eq("id", emailIds[index]).eq("user_id", link.user_id).single();
  if (!email) { await sendTelegramMessage(chatId, "Email not found."); return; }

  await supabaseAdmin.from("emails").update({ is_read: true }).eq("id", email.id);

  const body = email.body_text || stripHtml(email.body_html || "") || "(No content)";
  const truncated = body.length > 1500 ? body.substring(0, 1500) + "\n\n<i>…message truncated</i>" : body;

  const starLabel = email.is_starred ? "★ Unstar" : "☆ Star";

  let msg = `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📧 <b>${escapeHtml(email.subject)}</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `👤 <b>From:</b> ${escapeHtml(email.from_address)}\n`;
  msg += `👥 <b>To:</b> ${escapeHtml((email.to_addresses || []).join(", "))}\n`;
  msg += `📅 <b>Date:</b> ${new Date(email.received_at || email.created_at).toLocaleString()}\n\n`;
  msg += `${escapeHtml(truncated)}`;

  const kb = inlineKeyboard([
    [
      { text: "↩️ Reply", callback_data: `reply_${index}` },
      { text: starLabel, callback_data: `star_${index}` },
    ],
    [
      { text: "🗑️ Delete", callback_data: `delete_${index}` },
      { text: "🔗 Open in AfuChat", callback_data: `open_${index}` },
    ],
    [{ text: "◀️ Back to Inbox", callback_data: "cmd_inbox" }],
  ]);

  if (editMsgId) await editMessageText(chatId, editMsgId, msg, kb);
  else await sendTelegramMessage(chatId, msg, kb);
}

async function handleStar(chatId: number, index: number, callbackId: string) {
  const link = await getLinkedUser(chatId);
  if (!link) { await answerCallbackQuery(callbackId, "Not linked"); return; }

  let emailIds: string[];
  try { emailIds = JSON.parse(link.link_code || "[]"); } catch { return; }
  if (index < 0 || index >= emailIds.length) return;

  const { data: email } = await supabaseAdmin
    .from("emails").select("id, is_starred").eq("id", emailIds[index]).eq("user_id", link.user_id).single();
  if (!email) { await answerCallbackQuery(callbackId, "Email not found"); return; }

  await supabaseAdmin.from("emails").update({ is_starred: !email.is_starred }).eq("id", email.id);
  await answerCallbackQuery(callbackId, email.is_starred ? "⭐ Unstarred" : "⭐ Starred!");
}

async function handleDelete(chatId: number, index: number, callbackId: string, messageId: number) {
  const link = await getLinkedUser(chatId);
  if (!link) { await answerCallbackQuery(callbackId, "Not linked"); return; }

  let emailIds: string[];
  try { emailIds = JSON.parse(link.link_code || "[]"); } catch { return; }
  if (index < 0 || index >= emailIds.length) return;

  // Get trash folder
  const { data: trashFolder } = await supabaseAdmin
    .from("folders").select("id").eq("user_id", link.user_id).eq("type", "trash").single();

  if (trashFolder) {
    await supabaseAdmin.from("emails")
      .update({ folder_id: trashFolder.id, deleted_at: new Date().toISOString() })
      .eq("id", emailIds[index]).eq("user_id", link.user_id);
  }

  await answerCallbackQuery(callbackId, "🗑️ Moved to Trash");
  // Refresh inbox view
  await handleInbox(chatId, messageId);
}

async function handleSend(chatId: number, text: string) {
  const link = await getLinkedUser(chatId);
  if (!link) { await sendTelegramMessage(chatId, "❌ Account not linked. Use /start first."); return; }

  const parts = text.replace(/^\/send\s+/i, "").split("|").map(s => s.trim());
  if (parts.length < 3) {
    await sendTelegramMessage(chatId,
      `📝 <b>Send format:</b>\n\n<code>/send to@email.com | Subject | Body</code>\n\nSeparate fields with <code>|</code>`,
      inlineKeyboard([[{ text: "◀️ Back", callback_data: "cmd_inbox" }]])
    );
    return;
  }

  const [to, subject, ...bodyParts] = parts;
  const body = bodyParts.join("|");

  const { data: fromAddr } = await supabaseAdmin
    .from("email_addresses").select("full_email, id").eq("user_id", link.user_id).eq("is_primary", true).single();
  if (!fromAddr) { await sendTelegramMessage(chatId, "No email address found."); return; }

  const { data: sentFolder } = await supabaseAdmin
    .from("folders").select("id").eq("user_id", link.user_id).eq("type", "sent").single();

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      from: fromAddr.full_email, to: [to], subject,
      html: `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`,
      text: body, user_id: link.user_id, email_address_id: fromAddr.id, folder_id: sentFolder?.id,
    }),
  });

  if (sendRes.ok) {
    await sendTelegramMessage(chatId,
      `✅ <b>Email sent!</b>\n\n📤 To: ${escapeHtml(to)}\n📋 Subject: ${escapeHtml(subject)}`,
      inlineKeyboard([[{ text: "📬 Inbox", callback_data: "cmd_inbox" }, { text: "📝 Compose Another", callback_data: "cmd_compose" }]])
    );
  } else {
    const err = await sendRes.text();
    console.error("Send email failed:", err);
    await sendTelegramMessage(chatId, "❌ Failed to send email. Please try again.");
  }
}

async function handleUnread(chatId: number, editMsgId?: number) {
  const link = await getLinkedUser(chatId);
  if (!link) { await sendTelegramMessage(chatId, "❌ Account not linked."); return; }

  const { count } = await supabaseAdmin
    .from("emails").select("*", { count: "exact", head: true })
    .eq("user_id", link.user_id).eq("is_read", false).is("deleted_at", null);

  const text = `📩 You have <b>${count || 0}</b> unread email${(count || 0) !== 1 ? "s" : ""}.`;
  const kb = inlineKeyboard([
    [{ text: "📬 View Inbox", callback_data: "cmd_inbox" }, { text: "🔄 Refresh", callback_data: "cmd_unread" }],
  ]);

  if (editMsgId) await editMessageText(chatId, editMsgId, text, kb);
  else await sendTelegramMessage(chatId, text, kb);
}

async function handleNotify(chatId: number, enable: boolean, callbackId?: string) {
  await supabaseAdmin.from("telegram_links").update({ notifications_enabled: enable }).eq("chat_id", chatId);
  const text = enable ? "🔔 Notifications <b>enabled</b>!" : "🔕 Notifications <b>disabled</b>.";
  if (callbackId) await answerCallbackQuery(callbackId, enable ? "🔔 Enabled" : "🔕 Disabled");
  else await sendTelegramMessage(chatId, text);
}

async function handleSettings(chatId: number, editMsgId?: number) {
  const { data: tgLink } = await supabaseAdmin
    .from("telegram_links").select("notifications_enabled").eq("chat_id", chatId).maybeSingle();

  const notifStatus = tgLink?.notifications_enabled ? "🔔 On" : "🔕 Off";
  const toggleLabel = tgLink?.notifications_enabled ? "🔕 Turn Off Notifications" : "🔔 Turn On Notifications";
  const toggleData = tgLink?.notifications_enabled ? "notify_off" : "notify_on";

  const text = `⚙️ <b>Settings</b>\n\n` +
    `Notifications: ${notifStatus}\n\n` +
    `Manage your full account at ${APP_URL}/settings`;

  const kb = inlineKeyboard([
    [{ text: toggleLabel, callback_data: toggleData }],
    [{ text: "🔗 Open AfuChat Settings", url: `${APP_URL}/settings` } as any],
    [{ text: "🔓 Unlink Account", callback_data: "cmd_unlink_confirm" }],
    [{ text: "◀️ Back", callback_data: "cmd_inbox" }],
  ]);

  if (editMsgId) await editMessageText(chatId, editMsgId, text, kb);
  else await sendTelegramMessage(chatId, text, kb);
}

async function handleUnlink(chatId: number, messageId: number) {
  await supabaseAdmin.from("telegram_links").delete().eq("chat_id", chatId);
  await editMessageText(chatId, messageId,
    "✅ <b>Account unlinked.</b>\n\nUse /start to link again.",
    inlineKeyboard([[{ text: "🔗 Link Again", callback_data: "cmd_start" }]])
  );
}

async function handleHelp(chatId: number, editMsgId?: number) {
  const text =
    `📬 <b>AfuChat Mail Bot</b>\n\n` +
    `<b>Commands:</b>\n` +
    `/start — Link your account\n` +
    `/inbox — View latest emails\n` +
    `/send to | Subject | Body — Send email\n` +
    `/unread — Unread count\n` +
    `/help — This help menu\n\n` +
    `<b>Quick Actions:</b>\n` +
    `Use the buttons below emails to reply, star, or delete.\n\n` +
    `🌐 ${APP_URL}`;

  const kb = inlineKeyboard([
    [{ text: "📬 Inbox", callback_data: "cmd_inbox" }, { text: "📝 Compose", callback_data: "cmd_compose" }],
    [{ text: "⚙️ Settings", callback_data: "cmd_settings" }, { text: "📩 Unread", callback_data: "cmd_unread" }],
  ]);

  if (editMsgId) await editMessageText(chatId, editMsgId, text, kb);
  else await sendTelegramMessage(chatId, text, kb);
}

// ── Main handler ──

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Handle claim_link from web UI
    if (body.action === "claim_link") {
      const { code, user_id } = body;
      if (!code || !user_id) {
        return new Response(JSON.stringify({ error: "Missing code or user_id" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: pending } = await supabaseAdmin
        .from("telegram_links").select("*")
        .eq("link_code", code).eq("user_id", "00000000-0000-0000-0000-000000000000").maybeSingle();

      if (!pending) {
        return new Response(JSON.stringify({ error: "Invalid or expired link code" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (new Date(pending.link_code_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Link code expired. Send /start again in Telegram." }), {
          status: 410, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { error: updateErr } = await supabaseAdmin
        .from("telegram_links")
        .update({ user_id, link_code: null, link_code_expires_at: null })
        .eq("id", pending.id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      await sendTelegramMessage(pending.chat_id,
        `✅ <b>Account linked successfully!</b>\n\nYou'll receive email notifications here.`,
        inlineKeyboard([
          [{ text: "📬 View Inbox", callback_data: "cmd_inbox" }, { text: "⚙️ Settings", callback_data: "cmd_settings" }],
        ])
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Handle callback queries (inline button presses) ──
    if (body.callback_query) {
      const cq = body.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data as string;

      if (data === "cmd_inbox") { await answerCallbackQuery(cq.id); await handleInbox(chatId, messageId); }
      else if (data === "cmd_unread") { await answerCallbackQuery(cq.id); await handleUnread(chatId, messageId); }
      else if (data === "cmd_help") { await answerCallbackQuery(cq.id); await handleHelp(chatId, messageId); }
      else if (data === "cmd_settings") { await answerCallbackQuery(cq.id); await handleSettings(chatId, messageId); }
      else if (data === "cmd_compose") {
        await answerCallbackQuery(cq.id);
        await sendTelegramMessage(chatId,
          `📝 <b>Compose Email</b>\n\nSend using this format:\n\n<code>/send recipient@email.com | Subject | Your message</code>`,
          inlineKeyboard([[{ text: "◀️ Back to Inbox", callback_data: "cmd_inbox" }]])
        );
      }
      else if (data === "cmd_start") { await answerCallbackQuery(cq.id); await handleStart(chatId, cq.from?.username); }
      else if (data === "cmd_unlink_confirm") {
        await answerCallbackQuery(cq.id);
        await editMessageText(chatId, messageId,
          "⚠️ <b>Unlink your account?</b>\n\nYou'll stop receiving notifications and lose bot access.",
          inlineKeyboard([
            [{ text: "✅ Yes, Unlink", callback_data: "cmd_unlink" }, { text: "❌ Cancel", callback_data: "cmd_settings" }],
          ])
        );
      }
      else if (data === "cmd_unlink") { await answerCallbackQuery(cq.id, "Unlinked"); await handleUnlink(chatId, messageId); }
      else if (data === "notify_on") { await handleNotify(chatId, true, cq.id); await handleSettings(chatId, messageId); }
      else if (data === "notify_off") { await handleNotify(chatId, false, cq.id); await handleSettings(chatId, messageId); }
      else if (data.startsWith("read_")) {
        const idx = parseInt(data.split("_")[1]);
        await answerCallbackQuery(cq.id);
        await handleRead(chatId, idx, messageId);
      }
      else if (data.startsWith("star_")) {
        const idx = parseInt(data.split("_")[1]);
        await handleStar(chatId, idx, cq.id);
        await handleRead(chatId, idx, messageId); // refresh the view
      }
      else if (data.startsWith("delete_")) {
        const idx = parseInt(data.split("_")[1]);
        await handleDelete(chatId, idx, cq.id, messageId);
      }
      else if (data.startsWith("reply_")) {
        const idx = parseInt(data.split("_")[1]);
        await answerCallbackQuery(cq.id);
        // Get the email to prefill reply info
        const link = await getLinkedUser(chatId);
        if (link) {
          let emailIds: string[];
          try { emailIds = JSON.parse(link.link_code || "[]"); } catch { emailIds = []; }
          if (idx >= 0 && idx < emailIds.length) {
            const { data: email } = await supabaseAdmin
              .from("emails").select("from_address, subject").eq("id", emailIds[idx]).single();
            if (email) {
              const reSubject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
              await sendTelegramMessage(chatId,
                `↩️ <b>Reply to:</b> ${escapeHtml(email.from_address)}\n\n` +
                `Copy and edit this command:\n\n` +
                `<code>/send ${email.from_address} | ${escapeHtml(reSubject)} | Your reply here</code>`,
                inlineKeyboard([[{ text: "◀️ Back", callback_data: `read_${idx}` }]])
              );
              return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
          }
        }
      }
      else if (data.startsWith("open_")) {
        await answerCallbackQuery(cq.id, "Opening AfuChat…");
      }
      else { await answerCallbackQuery(cq.id); }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Handle text commands ──
    const message = body.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const username = message.from?.username;

    if (text === "/start") await handleStart(chatId, username);
    else if (text === "/inbox") await handleInbox(chatId);
    else if (text === "/help") await handleHelp(chatId);
    else if (text === "/unread") await handleUnread(chatId);
    else if (text === "/notify_on") await handleNotify(chatId, true);
    else if (text === "/notify_off") await handleNotify(chatId, false);
    else if (text === "/unlink") await handleUnlink(chatId, 0);
    else if (text === "/settings") await handleSettings(chatId);
    else if (text.match(/^\/read_(\d+)$/)) {
      const idx = parseInt(text.match(/^\/read_(\d+)$/)![1]) - 1;
      await handleRead(chatId, idx);
    }
    else if (text.startsWith("/send ")) await handleSend(chatId, text);
    else {
      await sendTelegramMessage(chatId,
        "🤔 Unknown command. Tap a button or use /help.",
        inlineKeyboard([
          [{ text: "📬 Inbox", callback_data: "cmd_inbox" }, { text: "❓ Help", callback_data: "cmd_help" }],
        ])
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Telegram bot error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
