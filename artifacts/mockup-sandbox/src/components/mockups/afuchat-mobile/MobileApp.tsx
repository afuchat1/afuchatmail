import { useState } from "react";
import {
  Inbox,
  Send,
  Star,
  Trash2,
  Search,
  Bell,
  ChevronRight,
  Pencil,
  ArrowLeft,
  MoreVertical,
  Mail,
  Settings,
  User,
  Check,
  Archive,
  RefreshCw,
  Plus,
} from "lucide-react";

const emails = [
  {
    id: 1,
    from: "AfuChat Team",
    avatar: "AT",
    avatarColor: "#0EA5E9",
    subject: "Weekly delivery summary is ready",
    preview: "Your weekly report shows 99.9% delivery rate across all campaigns...",
    time: "2m ago",
    unread: true,
    starred: false,
  },
  {
    id: 2,
    from: "Security",
    avatar: "S",
    avatarColor: "#10B981",
    subject: "New sign-in protection was enabled",
    preview: "Two-factor authentication has been successfully activated on your account.",
    time: "18m ago",
    unread: true,
    starred: false,
  },
  {
    id: 3,
    from: "Support",
    avatar: "Su",
    avatarColor: "#8B5CF6",
    subject: "Re: custom alias setup",
    preview: "Hi! Your custom alias john@afuchat.com has been successfully configured...",
    time: "1h ago",
    unread: false,
    starred: true,
  },
  {
    id: 4,
    from: "Billing",
    avatar: "B",
    avatarColor: "#F59E0B",
    subject: "Invoice #1042 for June 2025",
    preview: "Please find attached your invoice for the AfuChat Mail Pro plan.",
    time: "3h ago",
    unread: false,
    starred: false,
  },
  {
    id: 5,
    from: "Notifications",
    avatar: "N",
    avatarColor: "#EF4444",
    subject: "5 emails are waiting for your reply",
    preview: "You have unread messages from Acme Corp, Jason, and 3 others.",
    time: "Yesterday",
    unread: false,
    starred: false,
  },
  {
    id: 6,
    from: "David Okello",
    avatar: "DO",
    avatarColor: "#06B6D4",
    subject: "Project kickoff next Monday?",
    preview: "Hey, wanted to confirm if we're still on for the kickoff call on Monday morning.",
    time: "Yesterday",
    unread: false,
    starred: true,
  },
  {
    id: 7,
    from: "NewsDigest",
    avatar: "ND",
    avatarColor: "#64748B",
    subject: "Your daily tech briefing",
    preview: "Top stories: AI regulation updates, Startup funding rounds, Mobile OS security patches...",
    time: "Mon",
    unread: false,
    starred: false,
  },
];

type Tab = "inbox" | "starred" | "sent" | "settings";

function Avatar({ initials, color, size = 40 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ color: "#fff", fontSize: size * 0.35, fontWeight: "700", letterSpacing: 0.5 }}>
        {initials}
      </span>
    </div>
  );
}

function EmailRow({
  email,
  onTap,
}: {
  email: (typeof emails)[0];
  onTap: () => void;
}) {
  return (
    <div
      onClick={onTap}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        backgroundColor: email.unread ? "#0f1927" : "transparent",
        borderBottom: "1px solid #1e293b",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <Avatar initials={email.avatar} color={email.avatarColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span
            style={{
              color: email.unread ? "#f1f5f9" : "#94a3b8",
              fontWeight: email.unread ? "700" : "500",
              fontSize: 14,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginRight: 8,
            }}
          >
            {email.from}
          </span>
          <span style={{ color: "#64748b", fontSize: 11, flexShrink: 0 }}>{email.time}</span>
        </div>
        <div
          style={{
            color: email.unread ? "#e2e8f0" : "#64748b",
            fontWeight: email.unread ? "600" : "400",
            fontSize: 13,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email.subject}
        </div>
        <div
          style={{
            color: "#475569",
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email.preview}
        </div>
      </div>
      {email.unread && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#0EA5E9",
            marginTop: 6,
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

function EmailDetail({ email, onBack }: { email: (typeof emails)[0]; onBack: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0a0f1a",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "48px 16px 12px",
          backgroundColor: "#0d1524",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
        >
          <ArrowLeft size={22} />
        </button>
        <span style={{ flex: 1 }} />
        <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}>
          <Archive size={20} />
        </button>
        <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}>
          <Trash2 size={20} />
        </button>
        <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}>
          <MoreVertical size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: "700", marginBottom: 16, lineHeight: 1.4 }}>
          {email.subject}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Avatar initials={email.avatar} color={email.avatarColor} size={44} />
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: "600", fontSize: 14 }}>{email.from}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>to me · {email.time}</div>
          </div>
        </div>

        <div
          style={{
            color: "#94a3b8",
            fontSize: 15,
            lineHeight: 1.7,
            padding: "16px 0",
            borderTop: "1px solid #1e293b",
          }}
        >
          <p style={{ marginBottom: 12 }}>Hi there,</p>
          <p style={{ marginBottom: 12 }}>{email.preview}</p>
          <p style={{ marginBottom: 12 }}>
            We appreciate you being part of AfuChat Mail. Your @afuchat.com address gives you full control over your
            inbox — including smart filters, aliases, and end-to-end encrypted delivery.
          </p>
          <p style={{ marginBottom: 12 }}>
            If you have any questions or feedback, just hit reply — we read every message.
          </p>
          <p>Best,<br />The AfuChat Team</p>
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b", backgroundColor: "#0d1524" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            backgroundColor: "#131f33",
            borderRadius: 24,
            border: "1px solid #1e293b",
          }}
        >
          <span style={{ color: "#475569", fontSize: 14, flex: 1 }}>Reply to {email.from}…</span>
          <button
            style={{
              background: "#0EA5E9",
              border: "none",
              borderRadius: 20,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InboxScreen({ onEmailTap }: { onEmailTap: (email: (typeof emails)[0]) => void }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const unreadCount = emails.filter((e) => e.unread).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "48px 16px 12px",
          backgroundColor: "#0d1524",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>
              Inbox
            </div>
            <div style={{ color: "#f1f5f9", fontSize: 22, fontWeight: "800" }}>
              AfuChat Mail
              {unreadCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0EA5E9",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: "700",
                    borderRadius: 10,
                    padding: "1px 7px",
                    marginLeft: 8,
                    verticalAlign: "middle",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                background: "#131f33",
                border: "1px solid #1e293b",
                borderRadius: 20,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Bell size={18} color="#94a3b8" />
            </button>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: "linear-gradient(135deg, #0EA5E9, #8B5CF6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>U</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#131f33",
            borderRadius: 12,
            padding: "10px 14px",
            border: "1px solid #1e293b",
          }}
        >
          <Search size={16} color="#475569" />
          <span style={{ color: "#475569", fontSize: 14 }}>Search emails…</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 16px",
          backgroundColor: "#0d1524",
          borderBottom: "1px solid #1e293b",
        }}
      >
        {["All", "Unread", "Starred", "Important"].map((label, i) => (
          <div
            key={label}
            style={{
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: i === 0 ? "700" : "500",
              color: i === 0 ? "#0EA5E9" : "#64748b",
              borderBottom: i === 0 ? "2px solid #0EA5E9" : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#0a0f1a" }}>
        {emails.map((email) => (
          <EmailRow key={email.id} email={email} onTap={() => onEmailTap(email)} />
        ))}
      </div>
    </div>
  );
}

function ComposeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0a0f1a" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 16px 14px",
          backgroundColor: "#0d1524",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#64748b", fontSize: 14, cursor: "pointer" }}
        >
          Cancel
        </button>
        <span style={{ color: "#f1f5f9", fontWeight: "700", fontSize: 16 }}>New Message</span>
        <button
          style={{
            background: "#0EA5E9",
            border: "none",
            borderRadius: 16,
            padding: "6px 16px",
            color: "#fff",
            fontSize: 14,
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>

      {[
        { label: "To:", placeholder: "recipient@example.com" },
        { label: "Cc:", placeholder: "Optional" },
        { label: "Subject:", placeholder: "Email subject" },
      ].map((field) => (
        <div
          key={field.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <span style={{ color: "#64748b", fontSize: 14, width: 60 }}>{field.label}</span>
          <span style={{ color: "#334155", fontSize: 14, flex: 1 }}>{field.placeholder}</span>
        </div>
      ))}

      <div style={{ flex: 1, padding: 16 }}>
        <p style={{ color: "#334155", fontSize: 15 }}>Write your message here…</p>
        <div style={{ marginTop: 32, color: "#1e293b", fontSize: 13 }}>
          <p>—</p>
          <p style={{ marginTop: 4 }}>Sent via AfuChat Mail · your@afuchat.com</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "12px 20px",
          borderTop: "1px solid #1e293b",
          backgroundColor: "#0d1524",
        }}
      >
        {[
          { icon: <Plus size={20} />, label: "Attach" },
          { icon: <User size={20} />, label: "Contact" },
          { icon: <Star size={20} />, label: "Template" },
        ].map((action) => (
          <button
            key={action.label}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {action.icon}
            <span style={{ fontSize: 10 }}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen() {
  const items = [
    { label: "Account", sub: "your@afuchat.com", icon: <User size={18} color="#0EA5E9" /> },
    { label: "Notifications", sub: "Push, badges, sounds", icon: <Bell size={18} color="#8B5CF6" /> },
    { label: "Custom Domains", sub: "Manage your domains", icon: <Mail size={18} color="#10B981" /> },
    { label: "Security & Privacy", sub: "2FA, encryption", icon: <Check size={18} color="#F59E0B" /> },
    { label: "Aliases", sub: "2 active aliases", icon: <RefreshCw size={18} color="#EF4444" /> },
    { label: "Storage & Sync", sub: "4.2 GB used of 15 GB", icon: <Archive size={18} color="#06B6D4" /> },
    { label: "Appearance", sub: "Dark mode", icon: <Settings size={18} color="#64748b" /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0a0f1a" }}>
      <div style={{ padding: "52px 16px 16px", backgroundColor: "#0d1524", borderBottom: "1px solid #1e293b" }}>
        <div style={{ color: "#f1f5f9", fontSize: 22, fontWeight: "800" }}>Settings</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        <div style={{ padding: "8px 16px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "linear-gradient(135deg, #0EA5E9, #8B5CF6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>U</span>
            </div>
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: "700", fontSize: 16 }}>Your Name</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>your@afuchat.com</div>
              <div style={{ color: "#0EA5E9", fontSize: 12, fontWeight: "600", marginTop: 2 }}>Pro Plan · Active</div>
            </div>
          </div>
        </div>

        <div style={{ height: 8, backgroundColor: "#060c17" }} />

        {items.map((item, i) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 16px",
              borderBottom: i < items.length - 1 ? "1px solid #1e293b" : "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#131f33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: "500" }}>{item.label}</div>
              <div style={{ color: "#475569", fontSize: 12 }}>{item.sub}</div>
            </div>
            <ChevronRight size={16} color="#334155" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MobileApp() {
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<(typeof emails)[0] | null>(null);
  const [composing, setComposing] = useState(false);

  const navItems: { tab: Tab; icon: React.ReactNode; label: string }[] = [
    { tab: "inbox", icon: <Inbox size={22} />, label: "Inbox" },
    { tab: "starred", icon: <Star size={22} />, label: "Starred" },
    { tab: "sent", icon: <Send size={22} />, label: "Sent" },
    { tab: "settings", icon: <Settings size={22} />, label: "Settings" },
  ];

  const unreadCount = emails.filter((e) => e.unread).length;

  const renderScreen = () => {
    if (composing) return <ComposeScreen onBack={() => setComposing(false)} />;
    if (selectedEmail) return <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} />;

    switch (activeTab) {
      case "inbox":
        return <InboxScreen onEmailTap={setSelectedEmail} />;
      case "starred":
        return (
          <InboxScreen
            onEmailTap={setSelectedEmail}
          />
        );
      case "settings":
        return <SettingsScreen />;
      default:
        return (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "#334155" }}>
            <div style={{ textAlign: "center" }}>
              <Send size={40} color="#1e293b" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, color: "#475569", fontWeight: "600" }}>Sent</div>
              <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>No sent emails yet</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        width: 390,
        height: 844,
        backgroundColor: "#0a0f1a",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        overflow: "hidden",
        position: "relative",
        margin: "0 auto",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {renderScreen()}
      </div>

      {!composing && (
        <>
          {!selectedEmail && (
            <button
              onClick={() => setComposing(true)}
              style={{
                position: "absolute",
                bottom: 84,
                right: 20,
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "linear-gradient(135deg, #0EA5E9, #2563EB)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 24px rgba(14,165,233,0.4)",
                zIndex: 10,
              }}
            >
              <Pencil size={22} color="#fff" />
            </button>
          )}

          <div
            style={{
              display: "flex",
              borderTop: "1px solid #1e293b",
              backgroundColor: "#0d1524",
              paddingBottom: 24,
            }}
          >
            {navItems.map(({ tab, icon, label }) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedEmail(null); }}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  padding: "10px 0 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer",
                  color: activeTab === tab ? "#0EA5E9" : "#475569",
                  position: "relative",
                }}
              >
                {icon}
                <span style={{ fontSize: 10, fontWeight: activeTab === tab ? "700" : "500" }}>{label}</span>
                {tab === "inbox" && unreadCount > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: "calc(50% - 18px)",
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#EF4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{unreadCount}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
