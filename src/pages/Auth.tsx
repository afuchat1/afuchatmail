import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Mail, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import OAuthConsentScreen from "@/components/OAuthConsentScreen";
import { SiteHeader } from "@/components/SiteHeader";

interface OAuthParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: string;
}

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [preparingOAuth, setPreparingOAuth] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const VALID_SCOPES = ["openid", "profile", "email", "read:mailbox", "read:messages", "read:folders", "search:messages", "write:messages", "write:drafts"];
  const isOAuthFlow = searchParams.get("oauth") === "true";
  const rawScope = searchParams.get("scope") || "";
  const validatedScope = rawScope.split(" ").filter(s => VALID_SCOPES.includes(s.trim())).join(" ") || "read:mailbox read:messages";
  const oauthParams: OAuthParams | null = isOAuthFlow
    ? { clientId: searchParams.get("client_id") || "", redirectUri: searchParams.get("redirect_uri") || "", scope: validatedScope, state: searchParams.get("state") || "", responseType: searchParams.get("response_type") || "code" }
    : null;

  const fetchOrCreateEmailAddress = async (userId: string, authEmail: string | undefined) => {
    const { data: emailAddress } = await supabase.from("email_addresses").select("full_email, local_part").eq("user_id", userId).eq("is_primary", true).maybeSingle();
    if (emailAddress) return emailAddress.full_email || `${emailAddress.local_part}@afuchat.com`;
    if (!authEmail) return null;
    const baseUsername = authEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let suffix = 1;
    while (true) {
      const { data: existing } = await supabase.from("email_addresses").select("id").eq("local_part", username).maybeSingle();
      if (!existing) break;
      username = `${baseUsername}${suffix}`;
      suffix++;
    }
    const { data: newEmail, error: createError } = await supabase.from("email_addresses").insert({ user_id: userId, local_part: username, is_primary: true, is_alias: false }).select("local_part").single();
    if (createError || !newEmail) { console.error("Failed to create email address:", createError); return authEmail; }
    return `${newEmail.local_part}@afuchat.com`;
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        if (isOAuthFlow) { setPreparingOAuth(true); const email = await fetchOrCreateEmailAddress(session.user.id, session.user.email); setUserEmail(email); setPreparingOAuth(false); }
        else { navigate("/dashboard"); }
      }
      setCheckingAuth(false);
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        if (isOAuthFlow) { setPreparingOAuth(true); setTimeout(async () => { const email = await fetchOrCreateEmailAddress(session.user.id, session.user.email); setUserEmail(email); setPreparingOAuth(false); }, 0); }
        else { navigate("/dashboard"); }
      } else { setIsAuthenticated(false); setUserEmail(null); }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isOAuthFlow]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: isOAuthFlow ? `${window.location.origin}/auth?${searchParams.toString()}` : `${window.location.origin}/dashboard`, data: { full_name: fullName } } });
        if (error) throw error;
        toast({ title: "Account created!", description: "Check your email to verify your account." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: isOAuthFlow ? "Please review the authorization request." : "You've successfully signed in." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication error", description: error.message });
    } finally { setLoading(false); }
  };

  if (checkingAuth || preparingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm px-5 space-y-8">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isOAuthFlow && isAuthenticated && oauthParams && userEmail) {
    return <OAuthConsentScreen oauthParams={oauthParams} userEmail={userEmail} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
        <section className="hidden lg:flex lg:flex-col">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Secure access to your workspace
            </div>
            <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight">
              Sign in to a calmer, more professional inbox.
            </h1>
            <p className="mb-8 text-lg font-medium leading-8 text-muted-foreground">
              Manage aliases, send messages, and keep work communication organized from a flat, focused mail experience.
            </p>
            <div className="grid gap-3">
              {["Private by default", "No ads or tracking", "Fast inbox and alias management"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm font-black" data-testid={`text-auth-benefit-${index}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-8 lg:justify-self-end">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="block text-xl font-black">AfuChat Mail</span>
              <span className="text-xs font-bold text-muted-foreground">Secure account access</span>
            </div>
          </div>

          <h1 className="text-2xl font-black mb-1.5">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-sm font-medium text-muted-foreground mb-8">
            {isOAuthFlow ? "Sign in to authorize the application" : isSignUp ? "Get your @afuchat.com email" : "Sign in to your @afuchat.com inbox"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                <Input id="fullName" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  autoComplete="name"
                  className="h-12 border border-border bg-background rounded-xl shadow-xs focus:shadow-sm transition-shadow"
                  data-testid="input-full-name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                autoComplete="email"
                className="h-12 border border-border bg-background rounded-xl shadow-xs focus:shadow-sm transition-shadow"
                data-testid="input-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="h-12 border border-border bg-background rounded-xl shadow-xs focus:shadow-sm transition-shadow"
                data-testid="input-password" />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-black shadow-none text-[15px]" disabled={loading} data-testid="button-auth-submit">
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary font-bold hover:underline" data-testid="button-toggle-auth-mode">
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
