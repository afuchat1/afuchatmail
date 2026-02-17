import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import OAuthConsentScreen from "@/components/OAuthConsentScreen";

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

  const VALID_SCOPES = [
    "openid", "profile", "email",
    "read:mailbox", "read:messages", "read:folders",
    "search:messages", "write:messages", "write:drafts"
  ];

  const isOAuthFlow = searchParams.get("oauth") === "true";
  const rawScope = searchParams.get("scope") || "";
  const validatedScope = rawScope
    .split(" ")
    .filter(s => VALID_SCOPES.includes(s.trim()))
    .join(" ") || "read:mailbox read:messages";
    
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
    
    if (emailAddress) {
      return emailAddress.full_email || `${emailAddress.local_part}@afuchat.com`;
    }
    
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
      .insert({
        user_id: userId,
        local_part: username,
        is_primary: true,
        is_alias: false,
      })
      .select("local_part")
      .single();
    
    if (createError || !newEmail) {
      console.error("Failed to create email address:", createError);
      return authEmail;
    }
    
    return `${newEmail.local_part}@afuchat.com`;
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        
        if (isOAuthFlow) {
          setPreparingOAuth(true);
          const email = await fetchOrCreateEmailAddress(session.user.id, session.user.email);
          setUserEmail(email);
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
            const email = await fetchOrCreateEmailAddress(session.user.id, session.user.email);
            setUserEmail(email);
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
        toast({ title: "Account created!", description: "You can now sign in with your credentials." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: isOAuthFlow ? "Please review the authorization request." : "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || preparingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {preparingOAuth ? "Preparing authorization..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (isOAuthFlow && isAuthenticated && oauthParams && userEmail) {
    return <OAuthConsentScreen oauthParams={oauthParams} userEmail={userEmail} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-5 py-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">AfuChat Mail</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">
            {isSignUp ? "Create account" : "Sign in"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {isOAuthFlow
              ? "Sign in to authorize the application"
              : isSignUp
              ? "Get your @afuchat.com email"
              : "Access your @afuchat.com inbox"}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 border-0 bg-muted rounded-lg"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-0 bg-muted rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wide">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 border-0 bg-muted rounded-lg"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-lg" disabled={loading}>
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
