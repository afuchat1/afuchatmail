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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Parse OAuth parameters
  const isOAuthFlow = searchParams.get("oauth") === "true";
  const oauthParams: OAuthParams | null = isOAuthFlow
    ? {
        clientId: searchParams.get("client_id") || "",
        redirectUri: searchParams.get("redirect_uri") || "",
        scope: searchParams.get("scope") || "read:mailbox read:messages",
        state: searchParams.get("state") || "",
        responseType: searchParams.get("response_type") || "code",
      }
    : null;

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        
        // Get user's primary email address
        const { data: emailAddresses } = await supabase
          .from("email_addresses")
          .select("full_email, local_part")
          .eq("user_id", session.user.id)
          .eq("is_primary", true)
          .single();
        
        if (emailAddresses) {
          setUserEmail(emailAddresses.full_email || `${emailAddresses.local_part}@afuchat.com`);
        } else {
          setUserEmail(session.user.email || "");
        }
        
        // If not OAuth flow, redirect to dashboard
        if (!isOAuthFlow) {
          navigate("/dashboard");
        }
      }
      
      setCheckingAuth(false);
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        
        // Get user's primary email address
        const { data: emailAddresses } = await supabase
          .from("email_addresses")
          .select("full_email, local_part")
          .eq("user_id", session.user.id)
          .eq("is_primary", true)
          .single();
        
        if (emailAddresses) {
          setUserEmail(emailAddresses.full_email || `${emailAddresses.local_part}@afuchat.com`);
        } else {
          setUserEmail(session.user.email || "");
        }
        
        // If not OAuth flow, redirect to dashboard
        if (!isOAuthFlow) {
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

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse">Loading...</div>
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
