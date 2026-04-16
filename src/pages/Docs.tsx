import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ChevronRight, Book, Key, Shield, Code, Zap, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Book },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "endpoints", label: "Endpoints", icon: Zap },
  { id: "scopes", label: "Scopes", icon: Shield },
  { id: "oauth-flow", label: "OAuth Flow", icon: Code },
  { id: "errors", label: "Errors", icon: FileText },
] as const;

const apiBaseUrl = `https://vfcukxlzqfeehhkiogpf.supabase.co/functions/v1/afumail-api`;

const copyText = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
};

const CodeBlock = ({ children, label }: { children: string; label?: string }) => (
  <div className="relative group">
    <pre className="bg-[hsl(222,20%,11%)] text-[hsl(220,14%,86%)] text-[13px] leading-relaxed p-4 rounded-lg overflow-x-auto border border-[hsl(222,20%,18%)]">
      <code>{children}</code>
    </pre>
    <button
      onClick={() => copyText(children.trim(), label || "Code")}
      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-[hsl(222,20%,18%)] text-[hsl(220,10%,55%)] hover:text-[hsl(220,14%,86%)]"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  </div>
);

const Docs = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="AfuChat Mail" className="h-6" />
              <span className="text-[15px] font-semibold text-foreground">Docs</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-[13px]">
              {SECTIONS.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    activeSection === s.id
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
            <Button size="sm" variant="outline" onClick={() => navigate("/developers")} className="text-[13px] h-8">
              Developer Console
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="text-[13px] h-8">
              Get API access
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border overflow-y-auto py-6 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Documentation</p>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors text-left ${
                    activeSection === s.id
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

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resources</p>
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

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-10 space-y-16">
          {/* Overview */}
          <section id="overview">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              Docs <ChevronRight className="h-3 w-3" /> Overview
            </p>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground mb-3">
              Getting Started with AfuMail API
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">
              Access @afuchat.com mailboxes programmatically using OAuth 2.0. Read messages, list folders,
              search emails, and more — all through a secure, standards-compliant REST API.
            </p>

            {/* Quick start steps */}
            <div className="space-y-0 mb-10">
              {[
                { step: 1, title: "Create a developer account", desc: "Sign in at email.afuchat.com and open the Developer Console." },
                { step: 2, title: "Register an OAuth application", desc: "Give your app a name, add redirect URIs, and select the scopes you need." },
                { step: 3, title: "Implement OAuth 2.0 flow", desc: "Use the Authorization Code flow to get user consent and obtain access tokens." },
                { step: 4, title: "Call the API", desc: "Include the access token in your Authorization header and start reading mailbox data." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 py-4 border-b border-border last:border-0">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-foreground">{item.title}</h4>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* API Base URL */}
            <h3 className="text-[15px] font-semibold text-foreground mb-3">API Base URL</h3>
            <CodeBlock label="API URL">{apiBaseUrl}</CodeBlock>

            <p className="text-[13px] text-muted-foreground mt-3">
              <strong className="text-foreground">Public access:</strong> All documentation is freely accessible.
              You only need OAuth credentials when calling authenticated endpoints.
            </p>
          </section>

          {/* Authentication */}
          <section id="authentication">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              Docs <ChevronRight className="h-3 w-3" /> Authentication
            </p>
            <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-3">Authentication</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">
              AfuMail uses OAuth 2.0 Authorization Code flow. Include your access token in the
              <code className="mx-1 px-1.5 py-0.5 text-[13px] bg-muted rounded">Authorization</code> header on every request.
            </p>

            <h3 className="text-[15px] font-semibold text-foreground mb-3">Request format</h3>
            <CodeBlock label="cURL example">{`curl -X GET ${apiBaseUrl}/api/mailbox \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json"`}</CodeBlock>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">Token types</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Token</th>
                    <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Lifetime</th>
                    <th className="text-left py-2.5 font-semibold text-foreground">Usage</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-2.5 pr-4">Access token</td>
                    <td className="py-2.5 pr-4">1 hour</td>
                    <td className="py-2.5">API requests via Bearer header</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2.5 pr-4">Refresh token</td>
                    <td className="py-2.5 pr-4">30 days</td>
                    <td className="py-2.5">Exchange for new access token</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4">Authorization code</td>
                    <td className="py-2.5 pr-4">10 minutes</td>
                    <td className="py-2.5">One-time exchange for tokens</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Endpoints */}
          <section id="endpoints">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              Docs <ChevronRight className="h-3 w-3" /> Endpoints
            </p>
            <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-3">Available Endpoints</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">
              Read-only APIs for mailbox access. All endpoints require a valid access token.
            </p>

            <div className="space-y-0">
              {[
                { method: "GET", path: "/api/mailbox", desc: "Fetch user mailbox details including email address and storage info." },
                { method: "GET", path: "/api/mail/folders", desc: "List all folders (Inbox, Sent, Drafts, Spam, Trash) with unread counts." },
                { method: "GET", path: "/api/mail/messages", desc: "List email headers. Query params: folder, page, limit." },
                { method: "GET", path: "/api/mail/message/{id}", desc: "Fetch full email content including body and attachments." },
                { method: "GET", path: "/api/mail/search", desc: "Search emails. Query params: keyword, sender, date_from, date_to." },
              ].map((ep, i) => (
                <div key={i} className="flex items-start gap-3 py-4 border-b border-border last:border-0">
                  <Badge className="shrink-0 text-[11px] font-mono font-bold bg-primary/10 text-primary border-0 hover:bg-primary/10">
                    {ep.method}
                  </Badge>
                  <div className="min-w-0">
                    <code className="text-[13px] font-semibold text-foreground">{ep.path}</code>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{ep.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Scopes */}
          <section id="scopes">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              Docs <ChevronRight className="h-3 w-3" /> Scopes
            </p>
            <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-3">Available Scopes</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">
              Request only the permissions your app needs. Users see exactly which scopes you request on the consent screen.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Scope</th>
                    <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Category</th>
                    <th className="text-left py-2.5 font-semibold text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    { id: "openid", cat: "Identity", desc: "Enable OpenID authentication" },
                    { id: "profile", cat: "Identity", desc: "Access user profile information" },
                    { id: "email", cat: "Identity", desc: "Access user's email address" },
                    { id: "read:mailbox", cat: "Mail Read", desc: "Access mailbox info and folder list" },
                    { id: "read:messages", cat: "Mail Read", desc: "Read email messages" },
                    { id: "read:folders", cat: "Mail Read", desc: "Access folder structure" },
                    { id: "search", cat: "Mail Read", desc: "Search through emails" },
                    { id: "write:messages", cat: "Mail Write", desc: "Send emails on behalf of user" },
                    { id: "write:drafts", cat: "Mail Write", desc: "Create, edit, and delete drafts" },
                  ].map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4">
                        <code className="text-[12px] px-1.5 py-0.5 bg-muted rounded font-mono">{s.id}</code>
                      </td>
                      <td className="py-2.5 pr-4">{s.cat}</td>
                      <td className="py-2.5">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* OAuth Flow */}
          <section id="oauth-flow">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              Docs <ChevronRight className="h-3 w-3" /> OAuth Flow
            </p>
            <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-3">OAuth 2.0 Flow</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">
              Standard Authorization Code flow with PKCE support.
            </p>

            <h3 className="text-[15px] font-semibold text-foreground mb-3">1. Token Exchange</h3>
            <CodeBlock label="Token exchange">{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&client_id={client_id}
&client_secret={client_secret}
&redirect_uri={redirect_uri}`}</CodeBlock>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">2. Refresh Token</h3>
            <CodeBlock label="Refresh token">{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={client_id}
&client_secret={client_secret}`}</CodeBlock>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">3. Revoke Token</h3>
            <CodeBlock label="Revoke token">{`POST /api/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token={access_token_or_refresh_token}
&client_id={client_id}
&client_secret={client_secret}`}</CodeBlock>
          </section>

          {/* Errors */}
          <section id="errors">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              Docs <ChevronRight className="h-3 w-3" /> Errors
            </p>
            <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-3">Error Reference</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl mb-8">
              All errors return a JSON body with an <code className="mx-1 px-1.5 py-0.5 text-[13px] bg-muted rounded">error</code> field.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Status</th>
                    <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Error</th>
                    <th className="text-left py-2.5 font-semibold text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    { status: "400", error: "invalid_request", desc: "Missing or malformed parameters" },
                    { status: "401", error: "unauthorized", desc: "Missing or expired access token" },
                    { status: "403", error: "insufficient_scope", desc: "Token lacks required scope" },
                    { status: "404", error: "not_found", desc: "Resource does not exist" },
                    { status: "429", error: "rate_limited", desc: "Too many requests — try again later" },
                    { status: "500", error: "server_error", desc: "Internal error — contact support" },
                  ].map((e) => (
                    <tr key={e.error} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4">
                        <code className="text-[12px] px-1.5 py-0.5 bg-muted rounded font-mono">{e.status}</code>
                      </td>
                      <td className="py-2.5 pr-4 font-mono">{e.error}</td>
                      <td className="py-2.5">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-[15px] font-semibold text-foreground mt-8 mb-3">Example error response</h3>
            <CodeBlock label="Error example">{`{
  "error": "insufficient_scope",
  "error_description": "Token requires 'read:messages' scope",
  "status": 403
}`}</CodeBlock>
          </section>

          {/* CTA */}
          <section className="border border-border rounded-lg p-8 text-center">
            <h3 className="text-[18px] font-bold text-foreground mb-2">Ready to build on AfuMail?</h3>
            <p className="text-[14px] text-muted-foreground mb-6">
              Create your developer account and register your first OAuth application.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/developers")} className="text-[13px]">
                Open Developer Console <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/auth")} className="text-[13px]">
                Sign in
              </Button>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-8 pb-12 border-t border-border text-[12px] text-muted-foreground flex items-center justify-between">
            <span>© {new Date().getFullYear()} AfuChat Mail. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
              <Link to="/status" className="hover:text-foreground">API Status</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Docs;
