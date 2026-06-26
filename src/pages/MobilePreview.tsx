import { useState } from "react";

const SCREENS = ["signin", "inbox", "email", "compose", "settings"] as const;
type Screen = typeof SCREENS[number];

const LABEL: Record<Screen, string> = {
  signin: "Sign In",
  inbox: "Inbox",
  email: "Email",
  compose: "Compose",
  settings: "Settings",
};

/* ─── shared tokens ─── */
const bg = "#0f172a";
const card = "#1e293b";
const border = "#334155";
const primary = "#0ea5e9";
const text = "#f1f5f9";
const muted = "#94a3b8";
const dim = "#64748b";

/* ─── mock data ─── */
const emails = [
  { id: 1, from: "AfuChat Team", addr: "team@afuchat.com", subject: "Welcome to AfuMail! 🎉", preview: "Your account is set up and ready to go.", time: "2 min", read: false, star: false },
  { id: 2, from: "Security", addr: "security@afuchat.com", subject: "New sign-in protection enabled", preview: "We've added extra security to your account.", time: "18 min", read: false, star: true },
  { id: 3, from: "Support", addr: "support@afuchat.com", subject: "Re: custom alias setup", preview: "Your alias has been configured successfully.", time: "1 hr", read: true, star: false },
  { id: 4, from: "Newsletter", addr: "news@techdigest.io", subject: "This week in tech: AI & mobile", preview: "The biggest stories from the past 7 days.", time: "3 hr", read: true, star: false },
  { id: 5, from: "GitHub", addr: "noreply@github.com", subject: "Pull request merged: feat/mobile-app", preview: "Your changes have been merged into main.", time: "5 hr", read: true, star: false },
];

const avatarColors = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];
function avatarColor(from: string) { let s = 0; for (const c of from) s += c.charCodeAt(0); return avatarColors[s % avatarColors.length]; }
function initials(from: string) { const p = from.trim().split(" "); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : from[0].toUpperCase(); }

/* ─── screen renderers ─── */

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: primary, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 30 }}>✉</div>
        <div style={{ color: text, fontSize: 22, fontWeight: 700 }}>AfuMail</div>
        <div style={{ color: muted, fontSize: 12, marginTop: 3 }}>Professional email for everyone</div>
      </div>
      <div style={{ background: card, borderRadius: 14, padding: 18, border: `1px solid ${border}` }}>
        <div style={{ display: "flex", background: bg, borderRadius: 9, padding: 3, marginBottom: 18, gap: 3 }}>
          {(["in", "up"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer", background: mode === m ? primary : "transparent", color: mode === m ? "#fff" : muted, fontWeight: 600, fontSize: 13 }}>
              {m === "in" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>
        {mode === "up" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: muted, fontSize: 12, marginBottom: 5, fontWeight: 500 }}>Full Name</div>
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: "11px 13px", color: dim, fontSize: 14 }}>Your name</div>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: muted, fontSize: 12, marginBottom: 5, fontWeight: 500 }}>Email</div>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: "11px 13px", color: dim, fontSize: 14 }}>you@example.com</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: muted, fontSize: 12, marginBottom: 5, fontWeight: 500 }}>Password</div>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: "11px 13px", color: dim, fontSize: 14 }}>••••••••</div>
        </div>
        <div style={{ background: primary, borderRadius: 9, padding: "13px 0", textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>
          {mode === "in" ? "Sign In" : "Create Account"}
        </div>
      </div>
      <div style={{ textAlign: "center", color: dim, fontSize: 12, marginTop: 20 }}>Your @afuchat.com inbox is one tap away</div>
    </div>
  );
}

function Inbox({ onEmail }: { onEmail: () => void }) {
  const [starred, setStarred] = useState<number[]>([2]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: text, fontSize: 22, fontWeight: 700 }}>Inbox</div>
          <div style={{ color: primary, fontSize: 12, marginTop: 2 }}>2 unread</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 19, background: primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>✏️</div>
      </div>
      <div style={{ margin: "0 14px 8px", background: card, borderRadius: 10, display: "flex", alignItems: "center", padding: "9px 11px", border: `1px solid ${border}`, gap: 7 }}>
        <span style={{ fontSize: 14 }}>🔍</span>
        <span style={{ color: dim, fontSize: 13 }}>Search emails…</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {emails.map(e => (
          <div key={e.id} onClick={onEmail} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: `1px solid #1e293b`, background: e.read ? bg : "#0f1e2e", cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: avatarColor(e.from), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, marginRight: 11, flexShrink: 0 }}>
              {initials(e.from)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: e.read ? muted : text, fontWeight: e.read ? 400 : 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{e.from}</span>
                <span style={{ color: dim, fontSize: 11 }}>{e.time}</span>
              </div>
              <div style={{ color: e.read ? muted : text, fontWeight: e.read ? 400 : 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{e.subject}</div>
              <div style={{ color: dim, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.preview}</div>
            </div>
            <div onClick={ev => { ev.stopPropagation(); setStarred(s => s.includes(e.id) ? s.filter(x => x !== e.id) : [...s, e.id]); }}
              style={{ paddingLeft: 10, fontSize: 18, color: starred.includes(e.id) ? "#f59e0b" : dim }}>
              {starred.includes(e.id) ? "★" : "☆"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailDetail({ onBack }: { onBack: () => void }) {
  const e = emails[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: primary, fontSize: 20, cursor: "pointer" }}>←</button>
        <button style={{ background: "none", border: "none", color: text, fontSize: 18, cursor: "pointer" }}>↗</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        <div style={{ color: text, fontSize: 17, fontWeight: 700, lineHeight: 1.4, marginBottom: 14 }}>{e.subject}</div>
        <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, marginBottom: 12, overflow: "hidden" }}>
          {[["From", e.addr], ["To", "you@afuchat.com"], ["Date", "Mon, Jun 26, 2025 2:14 PM"]].map(([label, val], i) => (
            <div key={i}>
              {i > 0 && <div style={{ height: 1, background: "#1e293b", margin: "0 12px" }} />}
              <div style={{ display: "flex", padding: "10px 12px", gap: 10 }}>
                <span style={{ color: dim, fontSize: 12, width: 40, paddingTop: 1 }}>{label}</span>
                <span style={{ color: muted, fontSize: 12, flex: 1 }}>{val}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: 14 }}>
          <div style={{ color: text, fontSize: 14, lineHeight: 1.7 }}>
            Hi there! 👋<br /><br />
            Welcome to AfuMail — your new professional email address at <span style={{ color: primary }}>@afuchat.com</span>.<br /><br />
            You're all set to send and receive emails. Your inbox is private, fast, and ad-free.<br /><br />
            Enjoy! 🚀<br />
            — The AfuChat Team
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "10px 16px", borderTop: `1px solid ${border}` }}>
        <div style={{ flex: 1, background: primary, borderRadius: 9, padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
          <span style={{ color: "#fff", fontSize: 16 }}>↩</span>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Reply</span>
        </div>
        <div style={{ flex: 1, background: card, borderRadius: 9, padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px solid ${border}`, cursor: "pointer" }}>
          <span style={{ color: text, fontSize: 16 }}>↪</span>
          <span style={{ color: text, fontWeight: 600, fontSize: 14 }}>Forward</span>
        </div>
      </div>
    </div>
  );
}

function Compose() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px", borderBottom: `1px solid ${border}` }}>
        <span style={{ color: muted, fontSize: 15 }}>Cancel</span>
        <span style={{ color: text, fontSize: 16, fontWeight: 600 }}>New Message</span>
        <div style={{ background: primary, borderRadius: 7, padding: "7px 14px" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Send</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ color: dim, fontSize: 12, padding: "10px 16px 4px", fontWeight: 500 }}>From</div>
        <div style={{ color: muted, fontSize: 14, padding: "4px 16px 10px", borderBottom: `1px solid #1e293b` }}>you@afuchat.com</div>
        {[["To", "recipient@example.com"], ["Subject", "Your subject here…"]].map(([label, ph]) => (
          <div key={label} style={{ borderBottom: `1px solid #1e293b` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 16px" }}>
              <span style={{ color: dim, fontSize: 13, width: 52, fontWeight: 500 }}>{label}</span>
              <span style={{ color: dim, fontSize: 14, flex: 1 }}>{ph}</span>
            </div>
          </div>
        ))}
        <div style={{ padding: "14px 16px", color: dim, fontSize: 14, lineHeight: 1.7 }}>
          Write your message here…<br /><br /><br /><br />
        </div>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div style={{ overflowY: "auto", padding: "16px 18px 24px" }}>
      <div style={{ color: text, fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Settings</div>
      <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, display: "flex", alignItems: "center", padding: "14px", marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, marginRight: 12 }}>JD</div>
        <div>
          <div style={{ color: text, fontSize: 15, fontWeight: 600 }}>John Doe</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>john@afuchat.com</div>
        </div>
      </div>
      <div style={{ color: dim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Email Addresses</div>
      <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, marginBottom: 18, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ color: text, fontSize: 13 }}>john@afuchat.com</div>
          <div style={{ background: primary + "33", borderRadius: 4, padding: "2px 6px", display: "inline-block", marginTop: 4 }}>
            <span style={{ color: primary, fontSize: 11, fontWeight: 600 }}>Primary</span>
          </div>
        </div>
        <div style={{ height: 1, background: "#1e293b" }} />
        <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: muted, fontSize: 13 }}>john.alias@afuchat.com</div>
          <div style={{ background: border, borderRadius: 4, padding: "2px 6px" }}><span style={{ color: muted, fontSize: 11 }}>Alias</span></div>
        </div>
      </div>
      <div style={{ color: dim, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Preferences</div>
      <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "12px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: text, fontSize: 14, fontWeight: 500 }}>Push Notifications</div>
          <div style={{ color: dim, fontSize: 12, marginTop: 2 }}>Get notified for new emails</div>
        </div>
        <div style={{ width: 44, height: 26, borderRadius: 13, background: primary, position: "relative" }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 3, right: 3 }} />
        </div>
      </div>
      <div style={{ background: "#ef444422", borderRadius: 10, padding: "12px 0", textAlign: "center", border: "1px solid #ef444444", cursor: "pointer" }}>
        <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 15 }}>Sign Out</span>
      </div>
      <div style={{ textAlign: "center", color: dim, fontSize: 11, marginTop: 14 }}>AfuMail v1.0.0</div>
    </div>
  );
}

/* ─── phone frame ─── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 320, height: 640, borderRadius: 40, background: "#111827", boxShadow: "0 0 0 8px #1f2937, 0 0 0 10px #374151, 0 30px 80px rgba(0,0,0,.8)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <div style={{ height: 26, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 80, height: 6, borderRadius: 3, background: "#374151" }} />
      </div>
      <div style={{ flex: 1, background: bg, overflowY: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      <div style={{ height: 26, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#374151" }} />
      </div>
    </div>
  );
}

/* ─── tab bar ─── */
const TABS: { key: Screen; icon: string; label: string }[] = [
  { key: "inbox", icon: "📥", label: "Inbox" },
  { key: "email", icon: "⭐", label: "Starred" },
  { key: "compose", icon: "✏️", label: "Compose" },
  { key: "settings", icon: "⚙️", label: "Settings" },
];

function PhoneTabBar({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const tabMap = { inbox: "inbox", email: "inbox", compose: "compose", settings: "settings", signin: "inbox" } as Record<Screen, string>;
  return (
    <div style={{ display: "flex", background: card, borderTop: `1px solid ${border}`, height: 56 }}>
      {TABS.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: "none", border: "none", cursor: "pointer" }}>
          <span style={{ fontSize: 18, opacity: tabMap[active] === t.key ? 1 : 0.4 }}>{t.icon}</span>
          <span style={{ fontSize: 10, color: tabMap[active] === t.key ? primary : dim, fontWeight: 600 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── main page ─── */
export default function MobilePreview() {
  const [screen, setScreen] = useState<Screen>("inbox");

  const renderScreen = () => {
    switch (screen) {
      case "signin": return <SignIn />;
      case "inbox": return <Inbox onEmail={() => setScreen("email")} />;
      case "email": return <EmailDetail onBack={() => setScreen("inbox")} />;
      case "compose": return <Compose />;
      case "settings": return <Settings />;
    }
  };

  const isAuth = screen === "signin";

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 900, padding: "32px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✉</div>
          <div>
            <div style={{ color: text, fontSize: 20, fontWeight: 700 }}>AfuMail Android App</div>
            <div style={{ color: dim, fontSize: 13 }}>React Native · Expo · Play Store ready</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "20px 24px 8px", flexWrap: "wrap", justifyContent: "center" }}>
        {SCREENS.map(s => (
          <button key={s} onClick={() => setScreen(s)}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${screen === s ? primary : border}`, background: screen === s ? primary : card, color: screen === s ? "#fff" : muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {LABEL[s]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "24px 24px 40px", gap: 40, flexWrap: "wrap" }}>
        <PhoneFrame>
          {!isAuth && (
            <div style={{ height: 32, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 14px", gap: 6 }}>
              <span style={{ color: muted, fontSize: 10, fontWeight: 600 }}>9:41</span>
              <span style={{ color: muted, fontSize: 13 }}>▲</span>
              <span style={{ color: muted, fontSize: 13 }}>📶</span>
              <span style={{ color: muted, fontSize: 13 }}>🔋</span>
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {renderScreen()}
          </div>
          {!isAuth && <PhoneTabBar active={screen} onChange={setScreen} />}
        </PhoneFrame>

        <div style={{ maxWidth: 280, color: muted, fontSize: 14, lineHeight: 1.8, alignSelf: "center" }}>
          <div style={{ color: text, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>📱 Interactive Preview</div>
          <div style={{ marginBottom: 14 }}>Click the screens above or tap the bottom tabs inside the phone to navigate between views.</div>
          <div style={{ color: dim, fontSize: 12, marginBottom: 20 }}>This is a browser preview of your React Native app. The real app runs on Android via Expo.</div>
          <div style={{ color: text, fontWeight: 600, fontSize: 14, marginBottom: 10 }}>To run on your Android phone:</div>
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "12px 14px", fontSize: 12, fontFamily: "monospace", lineHeight: 2, color: muted }}>
            <div style={{ color: primary }}>$ cd mobile</div>
            <div>$ npm install</div>
            <div style={{ color: primary }}>$ npx expo start</div>
            <div style={{ color: dim }}># scan QR with Expo Go</div>
          </div>
          <div style={{ marginTop: 16, color: text, fontWeight: 600, fontSize: 14, marginBottom: 10 }}>To build an APK:</div>
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "12px 14px", fontSize: 12, fontFamily: "monospace", lineHeight: 2, color: muted }}>
            <div>$ npm install -g eas-cli</div>
            <div>$ eas login</div>
            <div style={{ color: primary }}>$ eas build --platform android \</div>
            <div style={{ paddingLeft: 16 }}>--profile preview</div>
          </div>
        </div>
      </div>
    </div>
  );
}
