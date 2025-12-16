import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type MailboxOption = {
  id: string;
  email: string;
  isPrimary: boolean;
  emailCount: number;
};

// Map client IDs to app names
const CLIENT_APP_NAMES: Record<string, string> = {
  afuchat_prod_001: "AfuChat",
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
const WHITELISTED_URIS = ["https://afuchat.com/auth/afumail/callback"];

const isRedirectUriWhitelisted = (uri: string): boolean => {
  if (WHITELISTED_URIS.includes(uri)) return true;
  const lovablePattern = /^https:\/\/[a-zA-Z0-9-]+\.lovableproject\.com\/auth\/afumail\/callback$/;
  return lovablePattern.test(uri);
};

const OAuthConsentScreen = ({ oauthParams, userEmail }: OAuthConsentScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [mailboxLoading, setMailboxLoading] = useState(true);
  const [mailboxes, setMailboxes] = useState<MailboxOption[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | undefined>(undefined);
  const [oauthApp, setOauthApp] = useState<{ id: string; name: string } | null>(null);
  const [appValidationError, setAppValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  const scopes = oauthParams.scope.split(" ").filter(Boolean);

  // Validate redirect URI
  const isValidRedirectUri = isRedirectUriWhitelisted(oauthParams.redirectUri);

  const selectedMailbox = useMemo(
    () => mailboxes.find((m) => m.id === selectedMailboxId),
    [mailboxes, selectedMailboxId],
  );

  // Use app name from database, fallback to client_id
  const appName = oauthApp?.name || CLIENT_APP_NAMES[oauthParams.clientId] || oauthParams.clientId;

  useEffect(() => {
    const loadData = async () => {
      setMailboxLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setMailboxes([]);
          setSelectedMailboxId(undefined);
          return;
        }

        // Validate OAuth application first
        const { data: app, error: appError } = await supabase
          .from("oauth_applications")
          .select("id, name")
          .eq("client_id", oauthParams.clientId)
          .maybeSingle();

        if (appError || !app) {
          setAppValidationError("Invalid client_id - application not found");
          return;
        }

        setOauthApp(app);

        // Load mailboxes
        const { data: accounts, error } = await supabase
          .from("email_addresses")
          .select("id, local_part, full_email, is_primary, is_alias, created_at")
          .eq("user_id", session.user.id)
          .eq("is_alias", false)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        const enriched: MailboxOption[] = await Promise.all(
          (accounts ?? []).map(async (acc) => {
            const { count } = await supabase
              .from("emails")
              .select("*", { count: "exact", head: true })
              .eq("email_address_id", acc.id)
              .is("deleted_at", null);

            return {
              id: acc.id,
              email: acc.full_email || `${acc.local_part}@afuchat.com`,
              isPrimary: !!acc.is_primary,
              emailCount: count ?? 0,
            };
          }),
        );

        setMailboxes(enriched);

        // Default: mailbox with most emails, else primary, else first
        if (enriched.length > 0) {
          const byCount = [...enriched].sort((a, b) => b.emailCount - a.emailCount);
          const best = byCount[0].emailCount > 0 ? byCount[0] : enriched.find((m) => m.isPrimary) || enriched[0];
          setSelectedMailboxId(best.id);
        } else {
          setSelectedMailboxId(undefined);
        }
      } catch (err: any) {
        console.error("Failed to load data:", err);
        toast({
          variant: "destructive",
          title: "Authorization failed",
          description: err?.message || "Failed to load data",
        });
      } finally {
        setMailboxLoading(false);
      }
    };

    loadData();
  }, [oauthParams.clientId, toast]);

  const handleAuthorize = async () => {
    if (!isValidRedirectUri) {
      toast({
        variant: "destructive",
        title: "Invalid redirect URI",
        description: "The redirect URI is not whitelisted.",
      });
      return;
    }

    if (!selectedMailboxId || !oauthApp) {
      toast({
        variant: "destructive",
        title: "Authorization failed",
        description: !oauthApp ? "Invalid application" : "Please select which mailbox to authorize.",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Verify selected mailbox belongs to user
      const { data: mailbox } = await supabase
        .from("email_addresses")
        .select("id")
        .eq("id", selectedMailboxId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mailbox) {
        throw new Error("Selected mailbox not found");
      }

      // Create authorization code using already validated app
      const { data: authCode, error: codeError } = await supabase
        .from("oauth_authorization_codes")
        .insert({
          application_id: oauthApp.id,
          user_id: session.user.id,
          email_address_id: selectedMailboxId,
          redirect_uri: oauthParams.redirectUri,
          scopes,
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
        description: error?.message || "Unknown error",
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
            <CardDescription>The redirect URI is not authorized for this application.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">Please contact the application developer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appValidationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold">Invalid Application</CardTitle>
            <CardDescription>{appValidationError}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              The client_id provided does not match any registered application.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mailboxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const canAuthorize = mailboxes.length > 0 && !!selectedMailboxId;

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

          {/* Mailbox selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Mailbox</p>
            <Select value={selectedMailboxId} onValueChange={setSelectedMailboxId}>
              <SelectTrigger>
                <SelectValue placeholder="Select mailbox" />
              </SelectTrigger>
              <SelectContent>
                {mailboxes.map((m) => {
                  const label = `${m.email}${m.isPrimary ? " • primary" : ""}${m.emailCount > 0 ? ` • ${m.emailCount} emails` : ""}`;
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">This is the mailbox {appName} will access.</p>
            {mailboxes.length === 0 && (
              <p className="text-xs text-destructive">No mailboxes found. Create an @afuchat.com email address first.</p>
            )}
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
            <Button variant="outline" className="flex-1" onClick={handleDeny} disabled={loading}>
              <XCircle className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button className="flex-1" onClick={handleAuthorize} disabled={loading || !canAuthorize}>
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
            By authorizing, you allow this app to access your data as specified above. You can revoke access at any time
            from your AfuMail settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthConsentScreen;
