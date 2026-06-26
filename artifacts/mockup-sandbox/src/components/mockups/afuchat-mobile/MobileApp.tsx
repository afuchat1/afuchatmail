import { useState } from "react";
import {
  Inbox, Send, Star, Trash2, Search, Bell, ChevronRight,
  Edit3, ArrowLeft, MoreHorizontal, Mail, Settings, User,
  Archive, RefreshCw, Plus, Check, Filter, Folder,
  Moon, Shield, LogOut, HelpCircle, Wifi, ChevronDown,
  AlertCircle, Clock, Tag, CornerUpLeft, CornerUpRight,
  Paperclip, Image, Smile, Mic, Eye, EyeOff, AtSign,
  Globe, Lock, CreditCard, Zap, ChevronLeft,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Screen =
  | "inbox" | "detail" | "compose" | "folders"
  | "settings" | "profile" | "notifications" | "search";
type Tab = "inbox" | "folders" | "compose" | "settings";

// ─── Data ────────────────────────────────────────────────────────────────────
const EMAILS = [
  { id: 1, from: "AfuChat Team", initials: "AT", color: "#6366F1", subject: "Welcome to AfuChat Mail 🎉", preview: "Your @afuchat.com address is ready. Start sending and receiving emails instantly.", time: "9:41 AM", date: "Today", unread: true, starred: true, hasAttachment: false, folder: "inbox" },
  { id: 2, from: "Security Alert", initials: "SA", color: "#EF4444", subject: "New sign-in from Kampala, UG", preview: "We noticed a new login to your account from a new device. If this was you, no action needed.", time: "8:20 AM", date: "Today", unread: true, starred: false, hasAttachment: false, folder: "inbox" },
  { id: 3, from: "David Okello", initials: "DO", color: "#10B981", subject: "Re: Project proposal revisions", preview: "Thanks for the updated doc. The pricing section looks good. Let's discuss the timeline Monday.", time: "Yesterday", date: "Yesterday", unread: false, starred: true, hasAttachment: true, folder: "inbox" },
  { id: 4, from: "Billing", initials: "Bi", color: "#F59E0B", subject: "Invoice #1042 — AfuChat Pro Plan", preview: "Your monthly invoice of UGX 35,000 for June 2025 is now available to download.", time: "Mon", date: "Mon", unread: false, starred: false, hasAttachment: true, folder: "inbox" },
  { id: 5, from: "Grace Nakato", initials: "GN", color: "#EC4899", subject: "Event invitation: AfuTech Meetup", preview: "You're invited to our quarterly tech meetup happening June 30th at the Innovation Hub, Nakawa.", time: "Sun", date: "Sun", unread: false, starred: false, hasAttachment: false, folder: "inbox" },
  { id: 6, from: "Notifications", initials: "No", color: "#8B5CF6", subject: "5 messages need your reply", preview: "You have unread replies from 5 conversations in your inbox.", time: "Sat", date: "Sat", unread: false, starred: false, hasAttachment: false, folder: "inbox" },
  { id: 7, from: "Support Team", initials: "ST", color: "#06B6D4", subject: "Your custom domain is verified ✓", preview: "Great news! yourname.com has been verified and is now active on your AfuChat account.", time: "Fri", date: "Fri", unread: false, starred: false, hasAttachment: false, folder: "inbox" },
];

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: <Inbox size={20} />, color: "#6366F1", count: 2 },
  { id: "starred", label: "Starred", icon: <Star size={20} />, color: "#F59E0B", count: 2 },
  { id: "sent", label: "Sent", icon: <Send size={20} />, color: "#10B981", count: 0 },
  { id: "drafts", label: "Drafts", icon: <Edit3 size={20} />, color: "#8B5CF6", count: 1 },
  { id: "archive", label: "Archive", icon: <Archive size={20} />, color: "#64748B", count: 0 },
  { id: "trash", label: "Trash", icon: <Trash2 size={20} />, color: "#EF4444", count: 0 },
  { id: "spam", label: "Spam", icon: <AlertCircle size={20} />, color: "#F97316", count: 0 },
];

// ─── StatusBar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 6px", backgroundColor: "#FAFAFA" }}>
      <span style={{ fontSize: 15, fontWeight: "700", color: "#111827", letterSpacing: -0.3 }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="4" width="3" height="8" rx="1" fill="#111827" opacity="0.4"/>
          <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill="#111827" opacity="0.6"/>
          <rect x="9" y="0.5" width="3" height="11.5" rx="1" fill="#111827"/>
          <rect x="13.5" y="0.5" width="3" height="11.5" rx="1" fill="#111827"/>
        </svg>
        <Wifi size={15} color="#111827" strokeWidth={2.2} />
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div style={{ width: 22, height: 11, borderRadius: 3, border: "1.5px solid #111827", display: "flex", alignItems: "center", padding: "1.5px 2px" }}>
            <div style={{ width: "75%", height: "100%", backgroundColor: "#111827", borderRadius: 1.5 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 42 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontSize: size * 0.36, fontWeight: "700" }}>{initials}</span>
    </div>
  );
}

// ─── SearchScreen ────────────────────────────────────────────────────────────
function SearchScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ padding: "8px 16px 12px", backgroundColor: "#FAFAFA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ChevronLeft size={24} color="#111827" /></button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, backgroundColor: "#F1F5F9", borderRadius: 14, padding: "10px 14px" }}>
            <Search size={18} color="#94A3B8" />
            <span style={{ color: "#94A3B8", fontSize: 15 }}>Search in AfuChat Mail…</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ color: "#64748B", fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Recent Searches</div>
        {["David Okello", "invoice june", "domain verification"].map(q => (
          <div key={q} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={16} color="#94A3B8" /></div>
            <span style={{ color: "#374151", fontSize: 15 }}>{q}</span>
            <ChevronRight size={16} color="#CBD5E1" style={{ marginLeft: "auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NotificationsScreen ─────────────────────────────────────────────────────
function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const notes = [
    { icon: <Mail size={20} color="#6366F1" />, bg: "#EEF2FF", title: "New email from David Okello", sub: "Re: Project proposal revisions", time: "2m ago" },
    { icon: <Shield size={20} color="#EF4444" />, bg: "#FEF2F2", title: "Security alert", sub: "New sign-in from Kampala, UG", time: "1h ago" },
    { icon: <Check size={20} color="#10B981" />, bg: "#F0FDF4", title: "Domain verified", sub: "yourname.com is now active", time: "Yesterday" },
    { icon: <CreditCard size={20} color="#F59E0B" />, bg: "#FFFBEB", title: "Invoice ready", sub: "June 2025 invoice is available", time: "Mon" },
  ];
  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 14px", backgroundColor: "#FAFAFA" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ChevronLeft size={24} color="#111827" /></button>
        <span style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginLeft: 8 }}>Notifications</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {notes.map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "16px 20px", borderBottom: "1px solid #F1F5F9", backgroundColor: i === 0 ? "#FAFBFF" : "#FAFAFA" }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#111827", fontSize: 14, fontWeight: i === 0 ? "700" : "500", marginBottom: 2 }}>{n.title}</div>
              <div style={{ color: "#64748B", fontSize: 13 }}>{n.sub}</div>
              <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 4 }}>{n.time}</div>
            </div>
            {i === 0 && <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#6366F1", marginTop: 6, flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── InboxScreen ──────────────────────────────────────────────────────────────
function InboxScreen({ emails, onEmailTap, onSearch, onNotif }: { emails: typeof EMAILS; onEmailTap: (e: typeof EMAILS[0]) => void; onSearch: () => void; onNotif: () => void }) {
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");
  const filtered = emails.filter(e => filter === "all" ? true : filter === "unread" ? e.unread : e.starred);
  const unread = emails.filter(e => e.unread).length;

  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      {/* Header */}
      <div style={{ padding: "4px 20px 0", backgroundColor: "#FAFAFA" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ color: "#6366F1", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>AfuChat Mail</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: "800", color: "#111827", letterSpacing: -0.5 }}>Inbox</span>
              {unread > 0 && <span style={{ backgroundColor: "#6366F1", color: "#fff", fontSize: 11, fontWeight: "800", borderRadius: 10, padding: "2px 8px" }}>{unread}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button onClick={onSearch} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Search size={18} color="#374151" />
            </button>
            <button onClick={onNotif} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <Bell size={18} color="#374151" />
              <div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#EF4444", border: "1.5px solid #FAFAFA" }} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>A</span>
            </div>
          </div>
        </div>
        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
          {(["all", "unread", "starred"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 20, border: "none", fontSize: 13, fontWeight: "600", cursor: "pointer", backgroundColor: filter === f ? "#6366F1" : "#F1F5F9", color: filter === f ? "#fff" : "#64748B" }}>
              {f === "all" ? "All Mail" : f === "unread" ? `Unread (${unread})` : "Starred"}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#E2E8F0", marginBottom: 2 }} />

      {/* Email List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Inbox size={32} color="#CBD5E1" /></div>
            <div style={{ color: "#374151", fontWeight: "700", fontSize: 17, marginBottom: 6 }}>No emails here</div>
            <div style={{ color: "#94A3B8", fontSize: 14 }}>You're all caught up!</div>
          </div>
        ) : filtered.map((email, i) => (
          <button key={email.id} onClick={() => onEmailTap(email)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
            <div style={{ display: "flex", gap: 14, padding: "14px 20px", backgroundColor: email.unread ? "#FEFEFE" : "#FAFAFA", borderBottom: "1px solid #F1F5F9", borderLeft: email.unread ? "3px solid #6366F1" : "3px solid transparent" }}>
              <div style={{ position: "relative" }}>
                <Avatar initials={email.initials} color={email.color} size={46} />
                {email.starred && <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FEF9C3", border: "1.5px solid #FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}><Star size={8} color="#F59E0B" fill="#F59E0B" /></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: email.unread ? "700" : "500", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{email.from}</span>
                  <span style={{ fontSize: 12, color: email.unread ? "#6366F1" : "#94A3B8", fontWeight: email.unread ? "700" : "400", flexShrink: 0 }}>{email.time}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: email.unread ? "600" : "400", color: email.unread ? "#1E293B" : "#374151", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.subject}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {email.hasAttachment && <Paperclip size={12} color="#94A3B8" />}
                  <span style={{ fontSize: 13, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.preview}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
        <div style={{ height: 96 }} />
      </div>
    </div>
  );
}

// ─── EmailDetail ──────────────────────────────────────────────────────────────
function EmailDetail({ email, onBack }: { email: typeof EMAILS[0]; onBack: () => void }) {
  const [starred, setStarred] = useState(email.starred);

  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      {/* Nav bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px 10px", backgroundColor: "#FAFAFA" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: "6px 4px" }}>
          <ChevronLeft size={24} color="#6366F1" />
          <span style={{ color: "#6366F1", fontSize: 16, fontWeight: "500" }}>Inbox</span>
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setStarred(!starred)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Star size={22} color={starred ? "#F59E0B" : "#94A3B8"} fill={starred ? "#F59E0B" : "none"} />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Archive size={20} color="#94A3B8" />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Trash2 size={20} color="#94A3B8" />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <MoreHorizontal size={20} color="#94A3B8" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Subject */}
        <div style={{ padding: "0 20px 16px" }}>
          <h1 style={{ fontSize: 20, fontWeight: "800", color: "#111827", lineHeight: 1.3, marginBottom: 14, letterSpacing: -0.3 }}>{email.subject}</h1>
          {/* Sender card */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <Avatar initials={email.initials} color={email.color} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{email.from}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>to me · {email.time}</div>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronDown size={18} color="#94A3B8" /></button>
          </div>

          {/* Body */}
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, marginBottom: 14 }}>Hi there,</p>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, marginBottom: 14 }}>{email.preview}</p>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, marginBottom: 14 }}>Your AfuChat Mail account gives you a clean, professional <span style={{ color: "#6366F1", fontWeight: "600" }}>@afuchat.com</span> address — with smart filters, custom aliases, Telegram integration, and end-to-end encryption built right in.</p>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, marginBottom: 20 }}>If you have any questions, just hit reply. We read every single message.</p>
            <div style={{ paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 14, color: "#374151", fontWeight: "500" }}>Warm regards,</div>
              <div style={{ fontSize: 14, color: "#6366F1", fontWeight: "700" }}>AfuChat Team</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>team@afuchat.com</div>
            </div>
          </div>

          {email.hasAttachment && (
            <div style={{ marginTop: 12, padding: "12px 14px", backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Paperclip size={18} color="#6366F1" /></div>
              <div><div style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>Attachment.pdf</div><div style={{ fontSize: 12, color: "#94A3B8" }}>284 KB · PDF</div></div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 10, padding: "0 20px 24px" }}>
          {[{ icon: <CornerUpLeft size={16} />, label: "Reply" }, { icon: <CornerUpRight size={16} />, label: "Forward" }].map(a => (
            <button key={a.label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 14, border: "1.5px solid #E2E8F0", backgroundColor: "#fff", cursor: "pointer", color: "#374151", fontSize: 15, fontWeight: "600", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
        <div style={{ height: 80 }} />
      </div>

      {/* Reply bar */}
      <div style={{ padding: "10px 16px 28px", backgroundColor: "#FAFAFA", borderTop: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 24, padding: "10px 16px", border: "1.5px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Avatar initials="A" color="#6366F1" size={30} />
          <span style={{ flex: 1, color: "#94A3B8", fontSize: 14 }}>Reply to {email.from}…</span>
          <button style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#6366F1", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ComposeScreen ────────────────────────────────────────────────────────────
function ComposeScreen({ onBack }: { onBack: () => void }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCC, setShowCC] = useState(false);

  const inputStyle: React.CSSProperties = { border: "none", outline: "none", backgroundColor: "transparent", fontSize: 15, color: "#111827", flex: 1, fontFamily: "inherit" };

  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px", backgroundColor: "#FAFAFA", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", color: "#6366F1", fontSize: 16, fontWeight: "500" }}>Cancel</button>
        <span style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>New Message</span>
        <button style={{ backgroundColor: "#6366F1", border: "none", borderRadius: 20, padding: "8px 18px", color: "#fff", fontSize: 15, fontWeight: "700", cursor: "pointer", opacity: to ? 1 : 0.5 }}>Send</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Fields */}
        <div style={{ backgroundColor: "#fff", margin: "12px 16px 0", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600", width: 40 }}>To:</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" style={{ ...inputStyle }} />
            <button onClick={() => setShowCC(!showCC)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 12, fontWeight: "600" }}>CC/BCC</button>
          </div>
          {showCC && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600", width: 40 }}>Cc:</span>
              <input placeholder="Optional" style={{ ...inputStyle }} />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
            <span style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600", width: 40 }}>Sub:</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" style={{ ...inputStyle }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ margin: "10px 16px 0", flex: 1 }}>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={"Compose your message here…"} style={{ width: "100%", minHeight: 220, border: "none", outline: "none", backgroundColor: "transparent", fontSize: 15, color: "#374151", lineHeight: 1.7, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          {/* Signature */}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 10, marginTop: 8 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>—</div>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Sent with <span style={{ color: "#6366F1", fontWeight: "600" }}>AfuChat Mail</span></div>
            <div style={{ color: "#CBD5E1", fontSize: 13 }}>your@afuchat.com</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 28px", backgroundColor: "#fff", borderTop: "1px solid #E2E8F0" }}>
        {[{ icon: <Paperclip size={22} />, label: "Attach" }, { icon: <Image size={22} />, label: "Photo" }, { icon: <Smile size={22} />, label: "Emoji" }, { icon: <AtSign size={22} />, label: "Mention" }, { icon: <Mic size={22} />, label: "Voice" }].map(a => (
          <button key={a.label} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {a.icon}
            <span style={{ fontSize: 10, color: "#94A3B8" }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FoldersScreen ─────────────────────────────────────────────────────────────
function FoldersScreen() {
  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ color: "#6366F1", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>AfuChat Mail</div>
        <div style={{ fontSize: 26, fontWeight: "800", color: "#111827", letterSpacing: -0.5 }}>Folders</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Storage banner */}
        <div style={{ margin: "0 16px 16px", backgroundColor: "#EEF2FF", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: "700", color: "#4338CA" }}>Storage</span>
            <span style={{ fontSize: 12, color: "#6366F1", fontWeight: "600" }}>4.2 GB / 15 GB</span>
          </div>
          <div style={{ height: 6, backgroundColor: "#C7D2FE", borderRadius: 3 }}>
            <div style={{ height: 6, width: "28%", backgroundColor: "#6366F1", borderRadius: 3 }} />
          </div>
        </div>

        {/* Folder list */}
        <div style={{ margin: "0 16px 24px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {FOLDERS.map((folder, i) => (
            <div key={folder.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderBottom: i < FOLDERS.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: folder.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: folder.color }}>{folder.icon}</div>
              </div>
              <span style={{ flex: 1, fontSize: 16, color: "#111827", fontWeight: "500" }}>{folder.label}</span>
              {folder.count > 0 && <span style={{ fontSize: 13, fontWeight: "700", color: "#6366F1" }}>{folder.count}</span>}
              <ChevronRight size={16} color="#CBD5E1" />
            </div>
          ))}
        </div>

        {/* Labels */}
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ color: "#64748B", fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>Labels</div>
        </div>
        <div style={{ margin: "0 16px 24px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {[{ name: "Work", color: "#6366F1" }, { name: "Personal", color: "#10B981" }, { name: "Finance", color: "#F59E0B" }].map((lbl, i, arr) => (
            <div key={lbl.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: lbl.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 15, color: "#111827" }}>{lbl.name}</span>
              <ChevronRight size={16} color="#CBD5E1" />
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, border: "1.5px dashed #CBD5E1", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 15, color: "#6366F1", fontWeight: "600" }}>Add label…</span>
          </div>
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
function SettingsScreen({ onProfile }: { onProfile: () => void }) {
  const sections = [
    {
      title: "Account",
      items: [
        { icon: <User size={19} color="#6366F1" />, bg: "#EEF2FF", label: "Profile & Identity", sub: "your@afuchat.com", onTap: onProfile },
        { icon: <AtSign size={19} color="#10B981" />, bg: "#F0FDF4", label: "Email Addresses", sub: "2 addresses active" },
        { icon: <Globe size={19} color="#06B6D4" />, bg: "#ECFEFF", label: "Custom Domains", sub: "yourname.com · verified" },
        { icon: <CreditCard size={19} color="#F59E0B" />, bg: "#FFFBEB", label: "Subscription & Billing", sub: "Pro Plan · Active" },
      ]
    },
    {
      title: "Privacy & Security",
      items: [
        { icon: <Lock size={19} color="#EF4444" />, bg: "#FEF2F2", label: "Password & 2FA", sub: "Enabled" },
        { icon: <Shield size={19} color="#8B5CF6" />, bg: "#F5F3FF", label: "Encryption", sub: "End-to-end for all mail" },
        { icon: <Eye size={19} color="#64748B" />, bg: "#F8FAFC", label: "Privacy Controls", sub: "Tracking blocked" },
      ]
    },
    {
      title: "App",
      items: [
        { icon: <Bell size={19} color="#F97316" />, bg: "#FFF7ED", label: "Notifications", sub: "Push, badges, sounds" },
        { icon: <Moon size={19} color="#6366F1" />, bg: "#EEF2FF", label: "Appearance", sub: "System default" },
        { icon: <Zap size={19} color="#10B981" />, bg: "#F0FDF4", label: "Telegram Bot", sub: "Connected" },
        { icon: <HelpCircle size={19} color="#94A3B8" />, bg: "#F8FAFC", label: "Help & Support", sub: "FAQs, contact us" },
      ]
    }
  ];

  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ fontSize: 26, fontWeight: "800", color: "#111827", letterSpacing: -0.5 }}>Settings</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Profile card */}
        <button onClick={onProfile} style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 16px 16px", padding: "16px", backgroundColor: "#fff", borderRadius: 18, border: "1px solid #E2E8F0", width: "calc(100% - 32px)", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", boxSizing: "border-box" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>A</span>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>Your Name</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>your@afuchat.com</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, backgroundColor: "#EEF2FF", borderRadius: 10, padding: "2px 8px" }}>
              <Zap size={11} color="#6366F1" fill="#6366F1" />
              <span style={{ fontSize: 11, color: "#6366F1", fontWeight: "700" }}>Pro Plan</span>
            </div>
          </div>
          <ChevronRight size={18} color="#CBD5E1" />
        </button>

        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: 8 }}>
            <div style={{ padding: "0 20px 8px", color: "#64748B", fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>{section.title}</div>
            <div style={{ margin: "0 16px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 8 }}>
              {section.items.map((item, i) => (
                <button key={item.label} onClick={item.onTap} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < section.items.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", width: "100%", background: "none", border: i < section.items.length - 1 ? "none" : "none", borderBottom: i < section.items.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 15, color: "#111827", fontWeight: "500" }}>{item.label}</div>
                    {item.sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>{item.sub}</div>}
                  </div>
                  <ChevronRight size={16} color="#CBD5E1" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <div style={{ margin: "8px 16px 16px" }}>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "15px 0", backgroundColor: "#FEF2F2", borderRadius: 16, border: "1px solid #FECACA", cursor: "pointer" }}>
            <LogOut size={18} color="#EF4444" />
            <span style={{ color: "#EF4444", fontSize: 16, fontWeight: "600" }}>Sign Out</span>
          </button>
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────
function ProfileScreen({ onBack }: { onBack: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const fields = [
    { label: "Display Name", value: "Your Name" },
    { label: "Email Address", value: "your@afuchat.com" },
    { label: "Recovery Email", value: "backup@gmail.com" },
    { label: "Phone", value: "+256 70x xxx xxxx" },
  ];
  return (
    <div style={{ flex: 1, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ display: "flex", alignItems: "center", padding: "6px 12px 12px", backgroundColor: "#FAFAFA" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}>
          <ChevronLeft size={24} color="#6366F1" />
          <span style={{ color: "#6366F1", fontSize: 16, fontWeight: "500" }}>Settings</span>
        </button>
        <span style={{ fontSize: 17, fontWeight: "700", color: "#111827", flex: 1, textAlign: "center", marginRight: 80 }}>Profile</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 24px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 88, height: 88, borderRadius: 44, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: "800", fontSize: 32 }}>A</span>
            </div>
            <button style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#6366F1", border: "2.5px solid #FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Edit3 size={12} color="#fff" />
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: "700", color: "#111827" }}>Your Name</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>your@afuchat.com</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "#EEF2FF", borderRadius: 12, padding: "4px 12px" }}>
            <Zap size={12} color="#6366F1" fill="#6366F1" />
            <span style={{ fontSize: 12, color: "#6366F1", fontWeight: "700" }}>Pro Plan · Active</span>
          </div>
        </div>

        <div style={{ padding: "0 20px 8px", color: "#64748B", fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>Account Details</div>
        <div style={{ margin: "0 16px 16px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          {fields.map((f, i) => (
            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < fields.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 15, color: "#111827" }}>{f.value}</div>
              </div>
              <button style={{ background: "none", border: "none", color: "#6366F1", fontSize: 14, fontWeight: "600", cursor: "pointer" }}>Edit</button>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 20px 8px", color: "#64748B", fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>Password</div>
        <div style={{ margin: "0 16px 24px", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600", marginBottom: 2 }}>Password</div>
            <div style={{ fontSize: 15, color: "#111827", letterSpacing: 2 }}>{showPassword ? "mypassword123" : "••••••••••"}</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={() => setShowPassword(!showPassword)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            <button style={{ background: "none", border: "none", color: "#6366F1", fontSize: 14, fontWeight: "600", cursor: "pointer" }}>Change</button>
          </div>
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
function TabBar({ active, onTab, unread }: { active: Tab; onTab: (t: Tab) => void; unread: number }) {
  const tabs: { id: Tab; icon: (a: boolean) => React.ReactNode; label: string }[] = [
    { id: "inbox", icon: a => <Inbox size={24} strokeWidth={a ? 2.5 : 1.8} />, label: "Inbox" },
    { id: "folders", icon: a => <Folder size={24} strokeWidth={a ? 2.5 : 1.8} />, label: "Folders" },
    { id: "compose", icon: a => <Edit3 size={24} strokeWidth={a ? 2.5 : 1.8} />, label: "Compose" },
    { id: "settings", icon: a => <Settings size={24} strokeWidth={a ? 2.5 : 1.8} />, label: "Settings" },
  ];

  return (
    <div style={{ display: "flex", backgroundColor: "#fff", borderTop: "1px solid #E2E8F0", paddingBottom: 20 }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onTab(tab.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative" }}>
            <div style={{ color: isActive ? "#6366F1" : "#94A3B8", position: "relative" }}>
              {tab.icon(isActive)}
              {tab.id === "inbox" && unread > 0 && (
                <div style={{ position: "absolute", top: -4, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff" }}>
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{unread}</span>
                </div>
              )}
            </div>
            <span style={{ fontSize: 10, color: isActive ? "#6366F1" : "#94A3B8", fontWeight: isActive ? "700" : "500" }}>{tab.label}</span>
            {isActive && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 36, height: 3, backgroundColor: "#6366F1", borderRadius: "0 0 3px 3px" }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function MobileApp() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [screen, setScreen] = useState<Screen>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<typeof EMAILS[0] | null>(null);

  const unread = EMAILS.filter(e => e.unread).length;

  const handleEmailTap = (email: typeof EMAILS[0]) => {
    setSelectedEmail(email);
    setScreen("detail");
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "compose") { setScreen("compose"); }
    else if (t === "folders") { setScreen("folders"); }
    else if (t === "settings") { setScreen("settings"); }
    else { setScreen("inbox"); setSelectedEmail(null); }
  };

  const goBack = () => {
    setScreen(tab === "settings" ? "settings" : "inbox");
    setSelectedEmail(null);
  };

  const showTabBar = !["detail", "compose", "profile", "search", "notifications"].includes(screen);
  const compositing = screen === "compose";

  const renderScreen = () => {
    switch (screen) {
      case "inbox": return <InboxScreen emails={EMAILS} onEmailTap={handleEmailTap} onSearch={() => setScreen("search")} onNotif={() => setScreen("notifications")} />;
      case "detail": return selectedEmail ? <EmailDetail email={selectedEmail} onBack={goBack} /> : null;
      case "compose": return <ComposeScreen onBack={() => { setTab("inbox"); setScreen("inbox"); }} />;
      case "folders": return <FoldersScreen />;
      case "settings": return <SettingsScreen onProfile={() => setScreen("profile")} />;
      case "profile": return <ProfileScreen onBack={goBack} />;
      case "search": return <SearchScreen onBack={goBack} />;
      case "notifications": return <NotificationsScreen onBack={goBack} />;
      default: return null;
    }
  };

  return (
    <div style={{ width: 390, height: 844, backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif", overflow: "hidden", margin: "0 auto", position: "relative" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {renderScreen()}
      </div>
      {showTabBar && <TabBar active={tab} onTab={handleTabChange} unread={unread} />}
    </div>
  );
}
