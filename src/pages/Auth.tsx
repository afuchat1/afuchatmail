import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, EyeOff, AtSign, Check, X, Loader2 } from "lucide-react";
import OAuthConsentScreen from "@/components/OAuthConsentScreen";

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0052ff"/>
    <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface OAuthParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: string;
}

const VALID_SCOPES = ["openid", "profile", "email", "read:mailbox", "read:messages", "read:folders", "search:messages", "write:messages", "write:drafts"];
const MAIL_DOMAIN = "afuchat.com";
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  // Sign-in uses the @afuchat.com address (or local-part — we append the domain)
  const [signInId, setSignInId] = useState("");
  // Sign-up takes a username only — that becomes username@afuchat.com
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [preparingOAuth, setPreparingOAuth] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const isOAuthFlow = searchParams.get("oauth") === "true";
  const rawScope = searchParams.get("scope") || "";
  const validatedScope = rawScope.split(" ").filter(s => VALID_SCOPES.includes(s.trim())).join(" ") || "read:mailbox read:messages";
  const oauthParams: OAuthParams | null = isOAuthFlow
    ? {
        clientId: searchParams.get("client_id") || "",
        redirectUri: searchParams.get("redirect_uri") || "",
        scope: validatedScope,
        state: searchParams.get("state") || "",
        responseType: searchParams.get("response_type") || "code",
      }
    : null;

  // Resolve any existing primary mailbox for the signed-in user (used for OAuth consent screen).
  const fetchPrimaryAddress = async (userId: string, fallbackEmail: string | undefined) => {
    const { data } = await supabase
      .from("email_addresses")
      .select("full_email, local_part")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (data) return data.full_email || `${data.local_part}@${MAIL_DOMAIN}`;
    return fallbackEmail ?? null;
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        if (isOAuthFlow) {
          setPreparingOAuth(true);
          const em = await fetchPrimaryAddress(session.user.id, session.user.email);
          setUserEmail(em);
          setPreparingOAuth(false);
        } else {
          navigate("/dashboard");
        }
      }
      setCheckingAuth(false);
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        if (isOAuthFlow) {
          setPreparingOAuth(true);
          setTimeout(async () => {
            const em = await fetchPrimaryAddress(session.user.id, session.user.email);
            setUserEmail(em);
            setPreparingOAuth(false);
          }, 0);
        } else {
          navigate("/dashboard");
        }
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isOAuthFlow]);

  // Live username availability check while typing (sign-up only)
  useEffect(() => {
    if (!isSignUp) return;
    const u = username.trim().toLowerCase();
    if (!u) { setUsernameStatus("idle"); return; }
    if (!USERNAME_RE.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("email_addresses")
        .select("id")
        .eq("local_part", u)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 350);
    return () => clearTimeout(t);
  }, [username, isSignUp]);

  // Normalize a sign-in identifier to a full email. Accepts "jane" or "jane@afuchat.com".
  const resolveSignInEmail = (id: string) => {
    const v = id.trim().toLowerCase();
    if (!v) return "";
    if (v.includes("@")) return v;
    return `${v}@${MAIL_DOMAIN}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const u = username.trim().toLowerCase();
        if (!USERNAME_RE.test(u)) {
          throw new Error("Username must be 2-30 chars: lowercase letters, numbers, dot, hyphen.");
        }
        if (usernameStatus === "taken") {
          throw new Error("That username is already taken. Try another.");
        }
        const newEmail = `${u}@${MAIL_DOMAIN}`;

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: newEmail,
          password,
          options: {
            emailRedirectTo: isOAuthFlow
              ? `${window.location.origin}/auth?${searchParams.toString()}`
              : `${window.location.origin}/dashboard`,
            data: { full_name: fullName, username: u },
          },
        });
        if (error) throw error;

        // Reserve the mailbox immediately so nobody else can claim the local_part,
        // even before email confirmation. RLS allows this only for auth.uid() === user_id,
        // which is satisfied when signUp returns a session (auto-confirm) — otherwise we
        // skip and let the post-confirm flow create it.
        if (signUpData.session && signUpData.user) {
          await supabase
            .from("email_addresses")
            .insert({
              user_id: signUpData.user.id,
              local_part: u,
              full_email: newEmail,
              is_primary: true,
              is_alias: false,
            });
        }

        toast({
          title: "Account created",
          description: `Your AfuChat Mail address is ${newEmail}. Check your inbox to verify.`,
        });
      } else {
        const email = resolveSignInEmail(signInId);
        if (!email) throw new Error("Enter your AfuChat Mail address or username.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || preparingOAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LogoIcon />
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (isOAuthFlow && isAuthenticated && oauthParams) {
    return (
      <OAuthConsentScreen
        oauthParams={oauthParams}
        userEmail={userEmail ?? ""}
      />
    );
  }

  const usernamePreview = username.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <LogoIcon />
            <span className="text-base font-semibold tracking-tight">AfuChat Mail</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              {isSignUp ? "Create your AfuChat Mail address" : "Sign in to AfuChat Mail"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? `Pick a username — it becomes your @${MAIL_DOMAIN} email.`
                : `Use your @${MAIL_DOMAIN} address or just your username.`}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="h-10 rounded text-sm"
                  autoComplete="name"
                />
              </div>
            )}

            {isSignUp ? (
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">Choose your address</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="yourname"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    required
                    minLength={2}
                    maxLength={30}
                    className="pl-9 pr-32 h-10 rounded text-sm"
                    autoComplete="username"
                    autoFocus
                    spellCheck={false}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                    @{MAIL_DOMAIN}
                  </span>
                </div>
                <div className="min-h-[18px] flex items-center gap-1.5 text-xs">
                  {usernameStatus === "checking" && (
                    <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Checking…</span></>
                  )}
                  {usernameStatus === "available" && usernamePreview && (
                    <><Check className="h-3 w-3 text-green-600" /><span className="text-green-600 font-medium">{usernamePreview}@{MAIL_DOMAIN} is available</span></>
                  )}
                  {usernameStatus === "taken" && (
                    <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">That address is already taken</span></>
                  )}
                  {usernameStatus === "invalid" && (
                    <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">Use lowercase letters, numbers, dot, hyphen (2–30)</span></>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="signInId" className="text-sm font-medium">Email or username</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signInId"
                    type="text"
                    placeholder={`yourname or yourname@${MAIL_DOMAIN}`}
                    value={signInId}
                    onChange={e => setSignInId(e.target.value)}
                    required
                    className="pl-9 h-10 rounded text-sm"
                    autoComplete="username"
                    autoFocus
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignUp ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 8 : undefined}
                  className="pr-10 h-10 rounded text-sm"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded font-semibold shadow-none mt-2"
              disabled={loading || (isSignUp && (usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "checking"))}
            >
              {loading
                ? (isSignUp ? "Creating account…" : "Signing in…")
                : (isSignUp ? "Create my address" : "Sign in")}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(v => !v)}
                className="font-semibold text-primary hover:underline"
              >
                {isSignUp ? "Sign in" : "Create one free"}
              </button>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Right: Feature showcase (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-[#0a0a0a] p-10">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/8 rounded-full px-3 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0052ff]" />
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Your own @afuchat.com</span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Email built for<br />
            <span className="text-[#0052ff]">professionals.</span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Sign up with a username and instantly own <span className="text-white/70">yourname@{MAIL_DOMAIN}</span>. Send and receive mail like Gmail or Yahoo — only better.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { title: "Pick your address", desc: "Your username is your real, sendable email" },
            { title: "Smart AI assist", desc: "Auto-complete, smart replies, writing improvements" },
            { title: "Threaded conversations", desc: "Group related emails automatically for context" },
            { title: "Scheduled send", desc: "Write now, deliver at the perfect time" },
            { title: "Real-time notifications", desc: "Push alerts on all devices instantly" },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-[#0052ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-[#0052ff]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} AfuChat Mail. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Auth;
