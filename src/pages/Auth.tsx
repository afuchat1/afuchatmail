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
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-11 w-full rounded" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-11 w-full rounded" />
            </div>
            <Skeleton className="h-11 w-full rounded" />
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

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <section className="hidden lg:flex lg:flex-col">
          <div className="max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-[#0052ff]" />
              Secure access to your workspace
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight">
              Sign in to a calmer, more professional inbox.
            </h1>
            <p className="mb-8 text-base leading-relaxed text-muted-foreground">
              Manage aliases, send messages, and keep work communication organized from a flat, focused mail experience.
            </p>
            <div className="grid gap-2">
              {["Private by default", "No ads or tracking", "Fast inbox and alias management"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 bg-neutral-50 p-4 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-[#0052ff] flex-shrink-0" />
                  <span className="text-sm font-medium" data-testid={`text-auth-benefit-${index}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full max-w-md bg-neutral-50 p-6 sm:p-8 rounded-2xl lg:justify-self-end">
          <div className="mb-7 flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="block text-base font-semibold">AfuChat Mail</span>
              <span className="text-xs text-muted-foreground">Secure account access</span>
            </div>
          </div>

          <h1 className="text-xl font-bold mb-1">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isOAuthFlow ? "Sign in to authorize the application" : isSignUp ? "Get your @afuchat.com email" : "Sign in to your @afuchat.com inbox"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Full Name</Label>
                <Input id="fullName" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  autoComplete="name"
                  className="h-10 rounded"
                  data-testid="input-full-name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                autoComplete="email"
                className="h-10 rounded"
                data-testid="input-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="h-10 rounded"
                data-testid="input-password" />
            </div>
            <Button type="submit" className="w-full h-10 rounded font-semibold shadow-none" disabled={loading} data-testid="button-auth-submit">
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary font-medium hover:underline" data-testid="button-toggle-auth-mode">
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
