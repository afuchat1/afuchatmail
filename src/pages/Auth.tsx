import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AtSign, Check, X, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import OAuthConsentScreen from "@/components/OAuthConsentScreen";
import { avatarColor, initials } from "@/lib/avatar";

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0052ff" />
    <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

type SignUpStep = "name" | "username" | "password";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<SignUpStep>("name");

  // Sign-in state
  const [signInId, setSignInId] = useState("");

  // Sign-up state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [password, setPassword] = useState("");

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

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const initialsPreview = useMemo(() => initials(fullName, username || "?"), [fullName, username]);
  const colorPreview = useMemo(() => avatarColor(username || fullName || "new"), [username, fullName]);

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // When the user reaches the username step, auto-derive a suggestion from their name (only if untouched).
  useEffect(() => {
    if (mode !== "signup" || step !== "username" || usernameTouched) return;
    const seed = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seed.length >= 2) setUsername(seed.slice(0, 30));
  }, [step, mode, firstName, lastName, usernameTouched]);

  // Live username availability check via SECURITY DEFINER RPC so it sees ALL addresses
  // (including admin-created ones), not just the ones the current visitor can SELECT.
  useEffect(() => {
    if (mode !== "signup" || step !== "username") return;
    const u = username.trim().toLowerCase();
    if (!u) { setUsernameStatus("idle"); return; }
    if (!USERNAME_RE.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", { _username: u });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data === false ? "taken" : "available");
    }, 350);
    return () => clearTimeout(t);
  }, [username, step, mode]);

  const resolveSignInEmail = (id: string) => {
    const v = id.trim().toLowerCase();
    if (!v) return "";
    if (v.includes("@")) return v;
    return `${v}@${MAIL_DOMAIN}`;
  };

  const goToStep = (next: SignUpStep) => {
    setStep(next);
  };

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim().length < 1 || lastName.trim().length < 1) {
      toast({ variant: "destructive", title: "Enter your name", description: "First and last name are both required." });
      return;
    }
    goToStep("username");
  };

  const handleUsernameNext = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) {
      toast({ variant: "destructive", title: "Pick a valid username", description: "2–30 chars, lowercase letters, numbers, dot, hyphen." });
      return;
    }
    if (usernameStatus !== "available") {
      toast({ variant: "destructive", title: "Username unavailable", description: "Please choose another username." });
      return;
    }
    goToStep("password");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = resolveSignInEmail(signInId);
      if (!email) throw new Error("Enter your AfuChat Mail address or username.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Welcome back!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sign-in failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = username.trim().toLowerCase();
      if (!USERNAME_RE.test(u)) throw new Error("Invalid username.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");

      // Final availability check right before submitting (race-safe).
      const { data: stillAvailable } = await supabase.rpc("username_available", { _username: u });
      if (stillAvailable === false) {
        setStep("username");
        setUsernameStatus("taken");
        throw new Error("That username was just taken. Please pick another.");
      }

      const newEmail = `${u}@${MAIL_DOMAIN}`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password,
        options: {
          emailRedirectTo: isOAuthFlow
            ? `${window.location.origin}/auth?${searchParams.toString()}`
            : `${window.location.origin}/dashboard`,
          data: { full_name: fullName, username: u, first_name: firstName.trim(), last_name: lastName.trim() },
        },
      });
      if (signUpError) throw signUpError;

      // Auto sign-in so the user lands in their inbox immediately and can start receiving mail right away.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: newEmail, password });
      if (signInError) {
        // Account was created; just ask them to sign in manually.
        toast({
          title: "Account created",
          description: `Your address is ${newEmail}. Please sign in to continue.`,
        });
        setMode("signin");
        setSignInId(u);
        return;
      }

      toast({
        title: "Welcome to AfuChat Mail!",
        description: `Your inbox ${newEmail} is ready — you can receive mail right away.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sign-up failed", description: err.message });
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
    return <OAuthConsentScreen oauthParams={oauthParams} userEmail={userEmail ?? ""} />;
  }

  const usernamePreview = username.trim().toLowerCase();
  const stepNumber = step === "name" ? 1 : step === "username" ? 2 : 3;

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <LogoIcon />
            <span className="text-base font-semibold tracking-tight">AfuChat Mail</span>
          </div>

          {mode === "signin" ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight mb-1">Sign in</h1>
                <p className="text-sm text-muted-foreground">Welcome back to AfuChat Mail.</p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signInId" className="text-sm font-medium">Email or username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="pr-10 h-10 rounded text-sm"
                      autoComplete="current-password"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-10 rounded font-semibold mt-2" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                New to AfuChat Mail?{" "}
                <button type="button" onClick={() => { setMode("signup"); setStep("name"); setPassword(""); }} className="font-semibold text-primary hover:underline">
                  Create an account
                </button>
              </p>
            </>
          ) : (
            <>
              {/* Sign-up multi-step */}
              <div className="mb-5 flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= stepNumber ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {step === "name" && (
                <>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight mb-1">Create your account</h1>
                    <p className="text-sm text-muted-foreground">Tell us your name to get started.</p>
                  </div>
                  <form onSubmit={handleNameNext} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
                      <Input id="firstName" type="text" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={50} className="h-10 rounded text-sm" autoComplete="given-name" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm font-medium">Last name</Label>
                      <Input id="lastName" type="text" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} required maxLength={50} className="h-10 rounded text-sm" autoComplete="family-name" />
                    </div>
                    <Button type="submit" className="w-full h-10 rounded font-semibold mt-2">
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </form>
                </>
              )}

              {step === "username" && (
                <>
                  <div className="mb-6 flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-sm"
                      style={{ backgroundColor: colorPreview }}
                      aria-hidden
                    >
                      {initialsPreview}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl font-bold tracking-tight">Hi {firstName}!</h1>
                      <p className="text-sm text-muted-foreground">Pick your AfuChat Mail address.</p>
                    </div>
                  </div>
                  <form onSubmit={handleUsernameNext} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-sm font-medium">Choose your address</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="yourname"
                          value={username}
                          onChange={e => { setUsername(e.target.value.toLowerCase().replace(/\s+/g, "")); setUsernameTouched(true); }}
                          required
                          minLength={2}
                          maxLength={30}
                          className="pl-9 pr-32 h-10 rounded text-sm"
                          autoComplete="username"
                          autoFocus
                          spellCheck={false}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">@{MAIL_DOMAIN}</span>
                      </div>
                      <div className="min-h-[18px] flex items-center gap-1.5 text-xs">
                        {usernameStatus === "checking" && <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Checking…</span></>}
                        {usernameStatus === "available" && usernamePreview && <><Check className="h-3 w-3 text-green-600" /><span className="text-green-600 font-medium">{usernamePreview}@{MAIL_DOMAIN} is available</span></>}
                        {usernameStatus === "taken" && <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">That address is already taken</span></>}
                        {usernameStatus === "invalid" && <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">Use lowercase letters, numbers, dot, hyphen (2–30)</span></>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="h-10 rounded font-semibold" onClick={() => goToStep("name")}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" className="flex-1 h-10 rounded font-semibold" disabled={usernameStatus !== "available"}>
                        Next <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </form>
                </>
              )}

              {step === "password" && (
                <>
                  <div className="mb-6 flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-sm"
                      style={{ backgroundColor: colorPreview }}
                      aria-hidden
                    >
                      {initialsPreview}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl font-bold tracking-tight truncate">{usernamePreview}@{MAIL_DOMAIN}</h1>
                      <p className="text-sm text-muted-foreground">Set a password to finish.</p>
                    </div>
                  </div>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          minLength={8}
                          className="pr-10 h-10 rounded text-sm"
                          autoComplete="new-password"
                          autoFocus
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Use 8+ characters with a mix of letters, numbers, and symbols.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="h-10 rounded font-semibold" onClick={() => goToStep("username")}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" className="flex-1 h-10 rounded font-semibold" disabled={loading || password.length < 8}>
                        {loading ? "Creating…" : "Create my address"}
                      </Button>
                    </div>
                  </form>
                </>
              )}

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => { setMode("signin"); setPassword(""); }} className="font-semibold text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Right showcase */}
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
            Sign up with a username and instantly own <span className="text-white/70">yourname@{MAIL_DOMAIN}</span>. A real, sendable inbox with smart AI assist.
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

        <p className="text-xs text-white/20">© {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Auth;
