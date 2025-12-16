import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Inbox, Search, FolderOpen, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OAuthParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: string;
}

interface OAuthConsentScreenProps {
  oauthParams: OAuthParams;
  userEmail: string;
}

// Map client IDs to app names
const CLIENT_APP_NAMES: Record<string, string> = {
  "afuchat_prod_001": "AfuChat",
  // Add more as needed
};

// Scope descriptions
const SCOPE_INFO: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  "read:mailbox": {
    label: "View mailbox info",
    description: "Access your mailbox details and storage usage",
    icon: <Inbox className="h-4 w-4" />,
  },
  "read:messages": {
    label: "Read emails",
    description: "View your email messages and attachments",
    icon: <Mail className="h-4 w-4" />,
  },
  "read:folders": {
    label: "View folders",
    description: "Access your email folders structure",
    icon: <FolderOpen className="h-4 w-4" />,
  },
  "search:messages": {
    label: "Search emails",
    description: "Search through your email messages",
    icon: <Search className="h-4 w-4" />,
  },
};

// Whitelisted redirect URIs
const WHITELISTED_URIS = [
  "https://afuchat.com/auth/afumail/callback",
];

const isRedirectUriWhitelisted = (uri: string): boolean => {
  // Check exact matches
  if (WHITELISTED_URIS.includes(uri)) return true;
  
  // Check lovableproject.com pattern for development
  const lovablePattern = /^https:\/\/[a-zA-Z0-9-]+\.lovableproject\.com\/auth\/afumail\/callback$/;
  if (lovablePattern.test(uri)) return true;
  
  return false;
};

const OAuthConsentScreen = ({ oauthParams, userEmail }: OAuthConsentScreenProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const appName = CLIENT_APP_NAMES[oauthParams.clientId] || oauthParams.clientId;
  const scopes = oauthParams.scope.split(" ").filter(Boolean);
  
  // Validate redirect URI
  const isValidRedirectUri = isRedirectUriWhitelisted(oauthParams.redirectUri);
  
  const handleAuthorize = async () => {
    if (!isValidRedirectUri) {
      toast({
        variant: "destructive",
        title: "Invalid redirect URI",
        description: "The redirect URI is not whitelisted.",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }
      
      // Get user's primary email address
      const { data: emailAddresses, error: emailError } = await supabase
        .from("email_addresses")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_primary", true)
        .single();
      
      if (emailError || !emailAddresses) {
        throw new Error("No email address found");
      }
      
      // Get the OAuth application by client_id
      const { data: app, error: appError } = await supabase
        .from("oauth_applications")
        .select("id")
        .eq("client_id", oauthParams.clientId)
        .single();
      
      if (appError || !app) {
        throw new Error("Invalid client_id");
      }
      
      // Create authorization code
      const { data: authCode, error: codeError } = await supabase
        .from("oauth_authorization_codes")
        .insert({
          application_id: app.id,
          user_id: session.user.id,
          email_address_id: emailAddresses.id,
          redirect_uri: oauthParams.redirectUri,
          scopes: scopes,
        })
        .select("code")
        .single();
      
      if (codeError || !authCode) {
        throw new Error("Failed to create authorization code");
      }
      
      // Redirect with authorization code
      const redirectUrl = new URL(oauthParams.redirectUri);
      redirectUrl.searchParams.set("code", authCode.code);
      if (oauthParams.state) {
        redirectUrl.searchParams.set("state", oauthParams.state);
      }
      
      window.location.href = redirectUrl.toString();
    } catch (error: any) {
      console.error("Authorization error:", error);
      toast({
        variant: "destructive",
        title: "Authorization failed",
        description: error.message,
      });
      setLoading(false);
    }
  };
  
  const handleDeny = () => {
    const redirectUrl = new URL(oauthParams.redirectUri);
    redirectUrl.searchParams.set("error", "access_denied");
    if (oauthParams.state) {
      redirectUrl.searchParams.set("state", oauthParams.state);
    }
    window.location.href = redirectUrl.toString();
  };
  
  if (!isValidRedirectUri) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold">Invalid Request</CardTitle>
            <CardDescription>
              The redirect URI is not authorized for this application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Please contact the application developer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Authorize {appName}</CardTitle>
          <CardDescription>
            <span className="font-medium text-foreground">{appName}</span> wants to access your AfuMail account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Signed in as */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium">{userEmail}</p>
          </div>
          
          {/* Requested permissions */}
          <div className="space-y-3">
            <p className="text-sm font-medium">This will allow {appName} to:</p>
            <div className="space-y-2">
              {scopes.map((scope) => {
                const info = SCOPE_INFO[scope];
                if (!info) return null;
                return (
                  <div key={scope} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="mt-0.5 text-primary">{info.icon}</div>
                    <div>
                      <p className="text-sm font-medium">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Scope badges */}
          <div className="flex flex-wrap gap-1">
            {scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="text-xs">
                {scope}
              </Badge>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDeny}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button
              className="flex-1"
              onClick={handleAuthorize}
              disabled={loading}
            >
              {loading ? (
                "Authorizing..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Authorize
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            By authorizing, you allow this app to access your data as specified above.
            You can revoke access at any time from your AfuMail settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthConsentScreen;
