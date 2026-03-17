import { useState, useEffect, useCallback, useRef } from "react";
import "./TelegramMiniApp.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const APP_URL = "https://email.afuchat.com";

// ── Types ──
interface TgUser { id: number; first_name?: string; username?: string }
interface EmailAddr { id: string; full_email: string; is_primary: boolean }
interface Folder { id: string; name: string; type: string; icon: string }
interface Email {
  id: string; from_address: string; to_addresses: string[]; subject: string;
  body_text?: string; body_html?: string; is_read: boolean; is_starred: boolean;
  is_important: boolean; received_at?: string; sent_at?: string; created_at: string;
  attachments?: any;
}
interface Session {
  user_id: string; profile: { full_name?: string }; email_addresses: EmailAddr[];
  folders: Folder[]; telegram_user: TgUser;
}

// ── Telegram WebApp SDK ──
declare global {
  interface Window { Telegram?: { WebApp?: any } }
}

function useTelegram() {
  const wa = window.Telegram?.WebApp;
  useEffect(() => {
    if (!wa) return;
    wa.ready();
    wa.expand();
    wa.enableClosingConfirmation?.();
    wa.setHeaderColor?.("#1a1f2e");
    wa.setBackgroundColor?.("#0f1219");
  }, [wa]);
  return wa;
}

// ── API helpers ──
async function authCall(initData: string): Promise<Session | { error: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-miniapp-auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  return res.json();
}

async function apiCall(userId: string, action: string, extra: Record<string, any> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-miniapp-api`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, action, ...extra }),
  });
  return res.json();
}

// ── Main Component ──
export default function TelegramMiniApp() {
  const wa = useTelegram();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"inbox" | "email" | "compose" | "folders">("inbox");
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const viewHistory = useRef<string[]>([]);

  // Auth
  useEffect(() => {
    const initData = wa?.initData;
    if (!initData) {
      // Dev fallback: show error
      setError("Open this app inside Telegram.");
      setLoading(false);
      return;
    }
    authCall(initData).then((res: any) => {
      if (res.error) {
        setError(res.error === "not_linked"
          ? "Account not linked. Send /start to @AfuChatMailBot first."
          : res.error);
      } else {
        setSession(res);
      }
      setLoading(false);
    }).catch(() => { setError("Connection failed"); setLoading(false); });
  }, [wa]);

  // Load emails when session or folder changes
  const loadEmails = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const res = await apiCall(session.user_id, "get_emails", { folder_type: activeFolder });
    setEmails(res.emails || []);
    setLoading(false);
  }, [session, activeFolder]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  // Unread count
  useEffect(() => {
    if (!session) return;
    apiCall(session.user_id, "unread_count").then(r => setUnreadCount(r.count || 0));
  }, [session, emails]);

  // Telegram back button
  useEffect(() => {
    if (!wa) return;
    if (view === "inbox" && activeFolder === "inbox") {
      wa.BackButton?.hide();
    } else {
      wa.BackButton?.show();
      wa.BackButton?.onClick(() => {
        if (view === "email" || view === "compose") setView("inbox");
        else if (view === "folders") setView("inbox");
        else if (activeFolder !== "inbox") { setActiveFolder("inbox"); }
      });
    }
    return () => wa.BackButton?.offClick?.();
  }, [wa, view, activeFolder]);

  const openEmail = async (email: Email) => {
    setSelectedEmail(email);
    setView("email");
    if (!email.is_read && session) {
      await apiCall(session.user_id, "read_email", { email_id: email.id });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
    }
  };

  const toggleStar = async (emailId: string) => {
    if (!session) return;
    const res = await apiCall(session.user_id, "toggle_star", { email_id: emailId });
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: res.is_starred } : e));
    if (selectedEmail?.id === emailId) setSelectedEmail(prev => prev ? { ...prev, is_starred: res.is_starred } : prev);
  };

  const deleteEmail = async (emailId: string) => {
    if (!session) return;
    wa?.showConfirm?.("Move to trash?", async (ok: boolean) => {
      if (!ok) return;
      await apiCall(session.user_id, "delete_email", { email_id: emailId });
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (view === "email") setView("inbox");
      wa?.HapticFeedback?.notificationOccurred("success");
    }) || (async () => {
      await apiCall(session.user_id, "delete_email", { email_id: emailId });
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (view === "email") setView("inbox");
    })();
  };

  // ── Loading / Error ──
  if (loading && !session) return <FullScreenMsg emoji="📬" text="Loading AfuChat..." />;
  if (error) return <FullScreenMsg emoji="⚠️" text={error} sub="Link your account via the bot first." />;
  if (!session) return <FullScreenMsg emoji="🔒" text="Unable to authenticate" />;

  return (
    <div className="tg-app">
      {/* Header */}
      <header className="tg-header">
        <div className="tg-header-left">
          <span className="tg-logo">📬</span>
          <div>
            <h1 className="tg-title">AfuChat Mail</h1>
            <span className="tg-subtitle">{session.email_addresses[0]?.full_email || ""}</span>
          </div>
        </div>
        {unreadCount > 0 && <span className="tg-badge">{unreadCount}</span>}
      </header>

      {/* Views */}
      {view === "inbox" && (
        <InboxView
          emails={emails} loading={loading} activeFolder={activeFolder}
          folders={session.folders} onOpenEmail={openEmail} onToggleStar={toggleStar}
          onChangeFolder={(type) => { setActiveFolder(type); }}
          onCompose={() => setView("compose")} onRefresh={loadEmails}
        />
      )}
      {view === "email" && selectedEmail && (
        <EmailView
          email={selectedEmail} onBack={() => setView("inbox")}
          onStar={() => toggleStar(selectedEmail.id)}
          onDelete={() => deleteEmail(selectedEmail.id)}
          onReply={() => setView("compose")}
        />
      )}
      {view === "compose" && (
        <ComposeView
          session={session} replyTo={view === "compose" && selectedEmail ? selectedEmail : undefined}
          onSent={() => { setView("inbox"); loadEmails(); wa?.HapticFeedback?.notificationOccurred("success"); }}
          onCancel={() => setView("inbox")}
        />
      )}

      {/* Bottom Nav */}
      <nav className="tg-nav">
        <NavBtn icon="📥" label="Inbox" active={view === "inbox" && activeFolder === "inbox"}
          badge={unreadCount} onClick={() => { setActiveFolder("inbox"); setView("inbox"); }} />
        <NavBtn icon="⭐" label="Starred" active={activeFolder === "__starred"}
          onClick={() => { setActiveFolder("inbox"); setView("inbox"); /* filter starred client-side handled via folder */ }} />
        <NavBtn icon="✏️" label="Compose" onClick={() => setView("compose")} />
        <NavBtn icon="📁" label="Folders" active={view === "folders"}
          onClick={() => setView("folders")} />
      </nav>

      {/* Folder picker overlay */}
      {view === "folders" && (
        <div className="tg-overlay" onClick={() => setView("inbox")}>
          <div className="tg-folder-sheet" onClick={e => e.stopPropagation()}>
            <h3>Folders</h3>
            {session.folders.map(f => (
              <button key={f.id} className={`tg-folder-item ${activeFolder === f.type ? "active" : ""}`}
                onClick={() => { setActiveFolder(f.type); setView("inbox"); }}>
                <FolderIcon type={f.type} /> {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function FullScreenMsg({ emoji, text, sub }: { emoji: string; text: string; sub?: string }) {
  return (
    <div className="tg-app tg-center">
      <span style={{ fontSize: 48 }}>{emoji}</span>
      <p className="tg-center-text">{text}</p>
      {sub && <p className="tg-center-sub">{sub}</p>}
    </div>
  );
}

function NavBtn({ icon, label, active, badge, onClick }: {
  icon: string; label: string; active?: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <button className={`tg-nav-btn ${active ? "active" : ""}`} onClick={onClick}>
      <span className="tg-nav-icon">{icon}</span>
      {badge ? <span className="tg-nav-badge">{badge > 99 ? "99+" : badge}</span> : null}
      <span className="tg-nav-label">{label}</span>
    </button>
  );
}

function FolderIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { inbox: "📥", sent: "📤", drafts: "📝", spam: "⚠️", trash: "🗑️" };
  return <span>{icons[type] || "📁"}</span>;
}

function InboxView({ emails, loading, activeFolder, folders, onOpenEmail, onToggleStar, onChangeFolder, onCompose, onRefresh }: {
  emails: Email[]; loading: boolean; activeFolder: string; folders: Folder[];
  onOpenEmail: (e: Email) => void; onToggleStar: (id: string) => void;
  onChangeFolder: (type: string) => void; onCompose: () => void; onRefresh: () => void;
}) {
  const folderName = folders.find(f => f.type === activeFolder)?.name || "Inbox";
  return (
    <div className="tg-content">
      <div className="tg-toolbar">
        <h2 className="tg-toolbar-title">{folderName}</h2>
        <button className="tg-icon-btn" onClick={onRefresh} title="Refresh">🔄</button>
      </div>

      {loading ? (
        <div className="tg-loading">
          {[1,2,3,4,5].map(i => <div key={i} className="tg-skeleton" />)}
        </div>
      ) : emails.length === 0 ? (
        <div className="tg-empty">
          <span style={{ fontSize: 40 }}>📭</span>
          <p>No emails here</p>
        </div>
      ) : (
        <div className="tg-email-list">
          {emails.map(email => (
            <div key={email.id} className={`tg-email-row ${!email.is_read ? "unread" : ""}`}
              onClick={() => onOpenEmail(email)}>
              <div className="tg-email-dot">{!email.is_read && <span className="tg-dot" />}</div>
              <div className="tg-email-body">
                <div className="tg-email-top">
                  <span className="tg-email-from">{email.from_address.split("@")[0]}</span>
                  <span className="tg-email-date">{formatDate(email.received_at || email.sent_at || email.created_at)}</span>
                </div>
                <div className="tg-email-subject">{email.subject || "(No subject)"}</div>
                <div className="tg-email-preview">{(email.body_text || "").slice(0, 80)}</div>
              </div>
              <button className="tg-star-btn" onClick={e => { e.stopPropagation(); onToggleStar(email.id); }}>
                {email.is_starred ? "⭐" : "☆"}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="tg-fab" onClick={onCompose}>✏️</button>
    </div>
  );
}

function EmailView({ email, onBack, onStar, onDelete, onReply }: {
  email: Email; onBack: () => void; onStar: () => void; onDelete: () => void; onReply: () => void;
}) {
  return (
    <div className="tg-content tg-email-view">
      <h2 className="tg-ev-subject">{email.subject}</h2>
      <div className="tg-ev-meta">
        <div className="tg-ev-avatar">{email.from_address[0]?.toUpperCase()}</div>
        <div>
          <div className="tg-ev-from">{email.from_address}</div>
          <div className="tg-ev-to">To: {(email.to_addresses || []).join(", ")}</div>
          <div className="tg-ev-date">{new Date(email.received_at || email.created_at).toLocaleString()}</div>
        </div>
      </div>

      <div className="tg-ev-actions">
        <button onClick={onReply}>↩️ Reply</button>
        <button onClick={onStar}>{email.is_starred ? "★ Starred" : "☆ Star"}</button>
        <button className="destructive" onClick={onDelete}>🗑️ Delete</button>
      </div>

      <div className="tg-ev-body">
        {email.body_html
          ? <div dangerouslySetInnerHTML={{ __html: email.body_html }} />
          : <pre>{email.body_text || "(No content)"}</pre>
        }
      </div>
    </div>
  );
}

function ComposeView({ session, replyTo, onSent, onCancel }: {
  session: Session; replyTo?: Email; onSent: () => void; onCancel: () => void;
}) {
  const [to, setTo] = useState(replyTo?.from_address || "");
  const [subject, setSubject] = useState(replyTo ? (replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`) : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to || !subject) return;
    setSending(true);
    const res = await apiCall(session.user_id, "send_email", { to, subject, text: body });
    setSending(false);
    if (res.ok) onSent();
  };

  return (
    <div className="tg-content tg-compose">
      <div className="tg-compose-header">
        <button onClick={onCancel}>Cancel</button>
        <h3>New Email</h3>
        <button className="tg-send-btn" onClick={send} disabled={sending || !to || !subject}>
          {sending ? "..." : "Send ➤"}
        </button>
      </div>
      <div className="tg-compose-from">From: {session.email_addresses[0]?.full_email}</div>
      <input className="tg-input" placeholder="To" value={to} onChange={e => setTo(e.target.value)} />
      <input className="tg-input" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
      <textarea className="tg-textarea" placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
