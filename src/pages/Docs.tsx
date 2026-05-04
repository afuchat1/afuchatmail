import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import {
  Book,
  Key,
  Shield,
  Zap,
  Code as CodeIcon,
  FileText,
  Send,
  Copy,
  ChevronRight,
  Globe,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Real API constants — these reflect the deployed afumail-api edge function
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = "https://vfcukxlzqfeehhkiogpf.supabase.co/functions/v1/afumail-api";
const AUTHORIZE_URL = "https://email.afuchat.com/oauth/authorize";
const DEVELOPER_CONSOLE = "/developers";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Book },
  { id: "quickstart", label: "Quickstart", icon: Zap },
  { id: "oauth", label: "OAuth 2.0 Flow", icon: Key },
  { id: "scopes", label: "Scopes", icon: Shield },
  { id: "endpoints", label: "API Endpoints", icon: CodeIcon },
  { id: "examples", label: "Examples", icon: Send },
  { id: "errors", label: "Errors", icon: FileText },
] as const;

// Pulled directly from the edge function router (parsePath + scope checks)
const ENDPOINTS: Array<{
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  scope: string;
  desc: string;
}> = [
  { method: "GET", path: "/api/user/me", scope: "openid / profile / email", desc: "OpenID Connect UserInfo. Returns sub, name, email, picture." },
  { method: "GET", path: "/api/accounts", scope: "read:mailbox", desc: "List all email addresses (and aliases) owned by the user." },
  { method: "POST", path: "/api/account/create", scope: "read:mailbox", desc: "Create an additional @afuchat.com address (max 3 per user)." },
  { method: "DELETE", path: "/api/account/{id}", scope: "read:mailbox", desc: "Delete a non-primary email address you own." },
  { method: "GET", path: "/api/mailbox", scope: "read:mailbox", desc: "Mailbox details: address, storage usage, account limits." },
  { method: "GET", path: "/api/mail/folders", scope: "read:mailbox", desc: "List folders (Inbox, Sent, Drafts, Spam, Trash) with unread counts." },
  { method: "GET", path: "/api/mail/messages", scope: "read:messages", desc: "List messages. Query: folder, page, limit." },
  { method: "GET", path: "/api/mail/message/{id}", scope: "read:messages", desc: "Full message: headers, body (text + html), attachments." },
  { method: "GET", path: "/api/mail/search", scope: "read:messages", desc: "Search. Query: q, sender, date_from, date_to." },
  { method: "POST", path: "/api/mail/send", scope: "write:messages", desc: "Send an email from the authorized account." },
  { method: "POST", path: "/api/mail/draft", scope: "write:drafts", desc: "Create a new draft." },
  { method: "PUT", path: "/api/mail/draft/{id}", scope: "write:drafts", desc: "Update an existing draft." },
  { method: "DELETE", path: "/api/mail/draft/{id}", scope: "write:drafts", desc: "Delete a draft." },
  { method: "POST", path: "/api/mail/action", scope: "write:messages", desc: "Bulk actions: mark read/unread, star, move, trash, delete." },
];

const SCOPES: Array<{ id: string; group: string; desc: string }> = [
  { id: "openid", group: "Identity", desc: "Required for OpenID Connect. Returns the stable user id (sub)." },
  { id: "profile", group: "Identity", desc: "Read the user's display name and avatar." },
  { id: "email", group: "Identity", desc: "Read the user's primary @afuchat.com address." },
  { id: "read:mailbox", group: "Mail (read)", desc: "Read mailbox metadata, folders, and account list." },
  { id: "read:messages", group: "Mail (read)", desc: "Read message headers, bodies, and attachments." },
  { id: "search:messages", group: "Mail (read)", desc: "Search across the user's messages." },
  { id: "write:messages", group: "Mail (write)", desc: "Send email and perform message actions (star, move, trash)." },
  { id: "write:drafts", group: "Mail (write)", desc: "Create, update, and delete drafts." },
];

const ERRORS: Array<{ status: string; code: string; desc: string }> = [
  { status: "400", code: "invalid_request", desc: "Missing or malformed request parameters." },
  { status: "400", code: "invalid_grant", desc: "Authorization code or refresh token is invalid or expired." },
  { status: "400", code: "invalid_scope", desc: "Requested scope is unknown or not granted." },
  { status: "400", code: "unsupported_grant_type", desc: "Only authorization_code and refresh_token are supported." },
  { status: "401", code: "invalid_client", desc: "client_id / client_secret pair did not match a registered app." },
  { status: "401", code: "invalid_token", desc: "Access token is missing, expired, or revoked." },
  { status: "403", code: "insufficient_scope", desc: "Your access token does not include the scope this endpoint requires." },
  { status: "404", code: "not_found", desc: "Route or resource does not exist." },
  { status: "405", code: "method_not_allowed", desc: "HTTP method is not supported on this endpoint." },
  { status: "500", code: "server_error", desc: "Unexpected error. Safe to retry with backoff." },
];

// ─────────────────────────────────────────────────────────────────────────────

const copy = (text: string, label = "Copied") => {
  navigator.clipboard.writeText(text);
  toast.success(label);
};

const Code = ({ children, label }: { children: string; label?: string }) => (
  <div className="relative group">
    <pre className="bg-[hsl(222,20%,11%)] text-[hsl(220,14%,86%)] text-[13px] leading-relaxed p-4 rounded-lg overflow-x-auto border border-[hsl(222,20%,18%)]">
      <code>{children}</code>
    </pre>
    <button
      onClick={() => copy(children.trim(), `${label || "Snippet"} copied`)}
      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-[hsl(222,20%,18%)] text-[hsl(220,10%,55%)] hover:text-[hsl(220,14%,86%)]"
      aria-label="Copy"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  </div>
);

const SectionHeader = ({
  crumb,
  title,
  blurb,
}: {
  crumb: string;
  title: string;
  blurb?: string;
}) => (
  <>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
      Docs <ChevronRight className="h-3 w-3" /> {crumb}
    </p>
    <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-3">{title}</h2>
    {blurb && (
      <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">{blurb}</p>
    )}
  </>
);

const methodColor: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  DELETE: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const Docs = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>("overview");

  const goTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="AfuChat Mail" className="h-6" />
              <span className="text-[15px] font-semibold text-foreground">Docs</span>
              <Badge variant="secondary" className="ml-1 text-[10px] font-semibold">Public</Badge>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-[13px]">
              {SECTIONS.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    active === s.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" variant="outline" onClick={() => navigate(DEVELOPER_CONSOLE)} className="text-[13px] h-8">
              Developer Console
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Documentation
          </p>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors text-left ${
                    active === s.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Resources
            </p>
            <div className="space-y-0.5 text-[13px]">
              <Link to="/developers" className="block px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50">
                Developer Console
              </Link>
              <Link to="/status" className="block px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50">
                API Status
              </Link>
              <Link to="/changelog" className="block px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50">
                Changelog
              </Link>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-10 space-y-16">
          {/* OVERVIEW */}
          <section id="overview">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
              AfuMail API · v1
            </p>
            <h1 className="text-[32px] font-bold tracking-tight text-foreground mb-3">
              Build email apps on AfuChat
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-6">
              The AfuMail API lets any third-party app read, send, and manage email on behalf of an
              AfuChat user — over HTTPS, secured by OAuth 2.0. Anyone signed in to AfuChat can
              register an app from the Developer Console and start integrating in minutes.
            </p>

            <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-8">
              <Globe className="h-3.5 w-3.5" />
              These docs are public. No login required to read them.
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                  Base URL
                </p>
                <code className="text-[12px] break-all">{API_BASE}</code>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                  Authorization endpoint
                </p>
                <code className="text-[12px] break-all">{AUTHORIZE_URL}</code>
              </div>
            </div>

            <Button onClick={() => navigate(DEVELOPER_CONSOLE)} className="text-[13px] h-9">
              Create an OAuth app
            </Button>
          </section>

          {/* QUICKSTART */}
          <section id="quickstart">
            <SectionHeader
              crumb="Quickstart"
              title="Get from zero to first API call in 5 minutes"
              blurb="Every AfuChat user can register OAuth applications. No paid plan or approval required."
            />

            <ol className="space-y-5 mb-8">
              {[
                {
                  t: "Sign in to AfuChat",
                  d: "Create a free account at email.afuchat.com if you do not have one yet.",
                },
                {
                  t: "Open the Developer Console",
                  d: "Go to /developers and click \"New OAuth app\". Set the name, redirect URIs, and the scopes you need.",
                },
                {
                  t: "Copy your client_id and client_secret",
                  d: "Store the secret somewhere safe — it is shown once. You can rotate it later from the console.",
                },
                {
                  t: "Send users to the authorization URL",
                  d: "Users sign in to AfuChat, choose which mailbox to share, and consent to your scopes.",
                },
                {
                  t: "Exchange the code for an access token",
                  d: "POST to /api/oauth/token with grant_type=authorization_code. Use the access token in the Authorization header.",
                },
              ].map((s, i) => (
                <li key={i} className="flex gap-4">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-foreground">{s.t}</h4>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h3 className="text-[15px] font-semibold text-foreground mb-3">First request</h3>
            <Code label="cURL — get the authorized user">{`curl -X GET "${API_BASE}/api/user/me" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`}</Code>
          </section>

          {/* OAUTH */}
          <section id="oauth">
            <SectionHeader
              crumb="OAuth 2.0"
              title="OAuth 2.0 Authorization Code flow"
              blurb="AfuMail implements the standard Authorization Code grant. State is required to prevent CSRF; PKCE is supported for public clients."
            />

            <h3 className="text-[15px] font-semibold text-foreground mb-3">1. Redirect the user to authorize</h3>
            <Code label="Authorization URL">{`${AUTHORIZE_URL}?oauth=true
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fyourapp.com%2Fauth%2Fafumail%2Fcallback
  &response_type=code
  &scope=openid%20profile%20email%20read%3Amailbox%20read%3Amessages
  &state=RANDOM_CSRF_TOKEN`}</Code>

            <p className="text-[13px] text-muted-foreground mt-3">
              After consent, AfuMail redirects to your <code className="px-1 py-0.5 bg-muted rounded text-[12px]">redirect_uri</code> with{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-[12px]">?code=...&state=...</code>.
              Verify <code className="px-1 py-0.5 bg-muted rounded text-[12px]">state</code> matches the value you sent.
            </p>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">2. Exchange the code for tokens</h3>
            <Code label="Token exchange">{`curl -X POST "${API_BASE}/api/oauth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code=AUTHORIZATION_CODE" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "redirect_uri=https://yourapp.com/auth/afumail/callback"`}</Code>

            <p className="text-[13px] text-muted-foreground mt-3 mb-3">Response:</p>
            <Code>{`{
  "access_token":  "…",
  "refresh_token": "…",
  "token_type":    "Bearer",
  "expires_in":    3600,
  "scope":         "openid profile email read:mailbox read:messages"
}`}</Code>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">3. Refresh an expired access token</h3>
            <Code label="Refresh">{`curl -X POST "${API_BASE}/api/oauth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=refresh_token" \\
  -d "refresh_token=REFRESH_TOKEN" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET"`}</Code>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">4. Revoke a token</h3>
            <Code label="Revoke">{`curl -X POST "${API_BASE}/api/oauth/revoke" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "token=ACCESS_OR_REFRESH_TOKEN" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET"`}</Code>

            <div className="mt-8 rounded-lg border border-border p-4 text-[13px] text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Token lifetimes</p>
              <ul className="space-y-1">
                <li>• <strong>Authorization code</strong> — 10 minutes, single use</li>
                <li>• <strong>Access token</strong> — 1 hour</li>
                <li>• <strong>Refresh token</strong> — 30 days, rotated on every refresh</li>
              </ul>
            </div>
          </section>

          {/* SCOPES */}
          <section id="scopes">
            <SectionHeader
              crumb="Scopes"
              title="Permission scopes"
              blurb="Request only what you need. Users see the exact list of scopes on the consent screen and can revoke at any time."
            />

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-foreground">Scope</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-foreground">Group</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-foreground">What it allows</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {SCOPES.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2.5 px-4">
                        <code className="text-[12px] px-1.5 py-0.5 bg-muted rounded font-mono">{s.id}</code>
                      </td>
                      <td className="py-2.5 px-4">{s.group}</td>
                      <td className="py-2.5 px-4">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ENDPOINTS */}
          <section id="endpoints">
            <SectionHeader
              crumb="Endpoints"
              title="API reference"
              blurb="Every endpoint requires a Bearer access token. Add the X-Account-Id header to scope a request to a specific @afuchat.com address you own."
            />

            <div className="rounded-lg border border-border divide-y divide-border">
              {ENDPOINTS.map((e, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <span className={`shrink-0 text-[11px] font-mono font-bold px-2 py-1 rounded ${methodColor[e.method]}`}>
                    {e.method}
                  </span>
                  <div className="min-w-0 flex-1">
                    <code className="text-[13px] font-semibold text-foreground break-all">{e.path}</code>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{e.desc}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Requires scope: <code className="px-1 py-0.5 bg-muted rounded text-[11px]">{e.scope}</code>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* EXAMPLES */}
          <section id="examples">
            <SectionHeader
              crumb="Examples"
              title="Common requests"
              blurb="Copy-paste ready snippets for the most-used endpoints."
            />

            <h3 className="text-[15px] font-semibold text-foreground mb-3">List inbox messages</h3>
            <Code>{`curl "${API_BASE}/api/mail/messages?folder=inbox&page=1&limit=25" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`}</Code>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">Send an email</h3>
            <Code>{`curl -X POST "${API_BASE}/api/mail/send" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to":      ["alice@example.com"],
    "subject": "Hello from AfuMail",
    "text":    "Sent via the AfuMail API.",
    "html":    "<p>Sent via the <strong>AfuMail API</strong>.</p>"
  }'`}</Code>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">Search messages</h3>
            <Code>{`curl "${API_BASE}/api/mail/search?q=invoice&date_from=2026-01-01" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`}</Code>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">Mark messages as read</h3>
            <Code>{`curl -X POST "${API_BASE}/api/mail/action" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "action": "mark_read", "message_ids": ["uuid-1", "uuid-2"] }'`}</Code>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">Switch active mailbox</h3>
            <p className="text-[13px] text-muted-foreground mb-3">
              When a user owns multiple AfuChat addresses, target a specific one with{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-[12px]">X-Account-Id</code>:
            </p>
            <Code>{`curl "${API_BASE}/api/mail/folders" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "X-Account-Id: EMAIL_ADDRESS_UUID"`}</Code>
          </section>

          {/* ERRORS */}
          <section id="errors">
            <SectionHeader
              crumb="Errors"
              title="Error reference"
              blurb={`All errors return JSON with an "error" message and a stable "code" field you can branch on.`}
            />

            <Code>{`{
  "error": "Invalid or expired access token",
  "code":  "invalid_token"
}`}</Code>

            <div className="mt-6 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-foreground">Status</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-foreground">Code</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-foreground">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {ERRORS.map((e) => (
                    <tr key={e.code + e.status} className="border-t border-border">
                      <td className="py-2.5 px-4 font-mono">{e.status}</td>
                      <td className="py-2.5 px-4">
                        <code className="text-[12px] px-1.5 py-0.5 bg-muted rounded font-mono">{e.code}</code>
                      </td>
                      <td className="py-2.5 px-4">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer CTA */}
          <section className="pt-8 border-t border-border">
            <div className="rounded-lg bg-accent/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground mb-1">Ready to build?</h3>
                <p className="text-[13px] text-muted-foreground">
                  Register an OAuth app and start calling the API in minutes.
                </p>
              </div>
              <Button onClick={() => navigate(DEVELOPER_CONSOLE)} className="text-[13px] h-9">
                Open Developer Console
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Docs;
