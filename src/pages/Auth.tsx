import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Shield } from "lucide-react";
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

  // Valid OAuth scopes - must match server-side validation
  const VALID_SCOPES = [
    "openid", "profile", "email",
    "read:mailbox", "read:messages", "read:folders",
    "search:messages", "write:messages", "write:drafts"
  ];

  // Parse and validate OAuth parameters
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
    // Try to get existing primary email address
    const { data: emailAddress } = await supabase
      .from("email_addresses")
      .select("full_email, local_part")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    
    if (emailAddress) {
      return emailAddress.full_email || `${emailAddress.local_part}@afuchat.com`;
    }
    
    // Create one if it doesn't exist
    if (!authEmail) {
      return null;
    }
    
    const baseUsername = authEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let suffix = 1;
    
    // Check if username exists, add suffix if needed
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
    
    // Create the email address
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
      return authEmail; // Fallback to auth email
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

    // Set up auth state listener
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
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "You can now sign in with your credentials.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: isOAuthFlow 
            ? "Please review the authorization request."
            : "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth or preparing OAuth
  if (checkingAuth || preparingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">
            {preparingOAuth ? "Preparing authorization..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // If OAuth flow and authenticated, show consent screen
  if (isOAuthFlow && isAuthenticated && oauthParams && userEmail) {
    return <OAuthConsentScreen oauthParams={oauthParams} userEmail={userEmail} />;
  }

  // Show login form (with OAuth context if applicable)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {isOAuthFlow && (
            <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-center">
            {isOAuthFlow
              ? "Sign in to authorize the application"
              : isSignUp
              ? "Sign up to create your @afuchat.com email"
              : "Sign in to manage your @afuchat.com emails"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
