import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, EyeOff } from "lucide-react";
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

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
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

  const fetchOrCreateEmailAddress = async (userId: string, authEmail: string | undefined) => {
    const { data: emailAddress } = await supabase
      .from("email_addresses")
      .select("full_email, local_part")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (emailAddress) return emailAddress.full_email || `${emailAddress.local_part}@afuchat.com`;
    if (!authEmail) return null;
    const baseUsername = authEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let suffix = 1;
    while (true) {
      const { data: existing } = await supabase
        .from("email_addresses")
        .select("id")
        .eq("local_part", username)
        .maybeSingle();
      if (!existing) break;
      username = `${baseUsername}${suffix}`;
      suffix++;
    }
    const { data: newEmail, error: createError } = await supabase
      .from("email_addresses")
      .insert({ user_id: userId, local_part: username, is_primary: true, is_alias: false })
      .select("local_part")
      .single();
    if (createError || !newEmail) return authEmail;
    return `${newEmail.local_part}@afuchat.com`;
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        if (isOAuthFlow) {
          setPreparingOAuth(true);
          const em = await fetchOrCreateEmailAddress(session.user.id, session.user.email);
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
            const em = await fetchOrCreateEmailAddress(session.user.id, session.user.email);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: isOAuthFlow
              ? `${window.location.origin}/auth?${searchParams.toString()}`
              : `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Check your email to verify your account." });
      } else {
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
        clientId={oauthParams.clientId}
        redirectUri={oauthParams.redirectUri}
        scope={oauthParams.scope}
        state={oauthParams.state}
        responseType={oauthParams.responseType}
        userEmail={userEmail}
      />
    );
  }

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
              {isSignUp ? "Create your account" : "Sign in to your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Get a free @afuchat.com email address"
                : "Access your AfuChat Mail inbox"}
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

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-9 h-10 rounded text-sm"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

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
              disabled={loading}
            >
              {loading
                ? (isSignUp ? "Creating account…" : "Signing in…")
                : (isSignUp ? "Create account" : "Sign in")}
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
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Professional Email</span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Email built for<br />
            <span className="text-[#0052ff]">professionals.</span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Get a free @afuchat.com address with AI-powered features, threaded conversations, and real-time notifications.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { title: "Smart AI assist", desc: "Auto-complete, smart replies, and writing improvements" },
            { title: "Threaded conversations", desc: "Group related emails automatically for context" },
            { title: "Scheduled send", desc: "Write now, deliver at the perfect time" },
            { title: "Real-time notifications", desc: "Push alerts on all devices instantly" },
            { title: "Multiple aliases", desc: "Different addresses for work, personal, and projects" },
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
