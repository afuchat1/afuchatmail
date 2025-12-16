import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Copy, Trash2, Key, Book, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface OAuthApp {
  id: string;
  name: string;
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

const Developers = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAppName, setNewAppName] = useState("");
  const [newAppRedirectUri, setNewAppRedirectUri] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("oauth_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching apps:", error);
      toast.error("Failed to load applications");
    } else {
      setApps((data as OAuthApp[]) || []);
    }
    setLoading(false);
  };

  const createApp = async () => {
    if (!newAppName.trim()) {
      toast.error("Please enter an app name");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const redirectUris = newAppRedirectUri.trim() 
      ? newAppRedirectUri.split(",").map(uri => uri.trim())
      : [];

    const { error } = await supabase
      .from("oauth_applications")
      .insert({
        user_id: session.user.id,
        name: newAppName.trim(),
        redirect_uris: redirectUris,
        scopes: ["read:mailbox", "read:messages"],
      });

    if (error) {
      console.error("Error creating app:", error);
      toast.error("Failed to create application");
    } else {
      toast.success("Application created successfully");
      setNewAppName("");
      setNewAppRedirectUri("");
      setDialogOpen(false);
      fetchApps();
    }
  };

  const deleteApp = async (id: string) => {
    const { error } = await supabase
      .from("oauth_applications")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete application");
    } else {
      toast.success("Application deleted");
      fetchApps();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const apiBaseUrl = `https://vfcukxlzqfeehhkiogpf.supabase.co/functions/v1/afumail-api`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Developer Portal</h1>
            <p className="text-sm text-muted-foreground">Manage API access and integrations</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="apps" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apps" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              My Applications
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              API Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apps" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium">OAuth Applications</h2>
                <p className="text-sm text-muted-foreground">
                  Register applications to access AfuMail API
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Application</DialogTitle>
                    <DialogDescription>
                      Register a new OAuth application to access AfuMail API
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-name">Application Name</Label>
                      <Input
                        id="app-name"
                        placeholder="My Email App"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="redirect-uri">Redirect URIs (comma-separated)</Label>
                      <Input
                        id="redirect-uri"
                        placeholder="https://myapp.com/callback"
                        value={newAppRedirectUri}
                        onChange={(e) => setNewAppRedirectUri(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createApp}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : apps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No applications yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first OAuth application to start using the API
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Application
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {apps.map((app) => (
                  <Card key={app.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                          <CardDescription>
                            Created {new Date(app.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteApp(app.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Client ID</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-muted px-2 py-1 rounded truncate">
                              {app.client_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(app.client_id, "Client ID")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Client Secret</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-muted px-2 py-1 rounded truncate">
                              {showSecrets[app.id] ? app.client_secret : "••••••••••••••••"}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowSecrets(prev => ({ ...prev, [app.id]: !prev[app.id] }))}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(app.client_secret, "Client Secret")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {app.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Base URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                    {apiBaseUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(apiBaseUrl, "API URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>OAuth 2.0 Authorization Code Flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">1. Token Exchange</h4>
                  <code className="block bg-muted p-3 rounded text-sm overflow-x-auto whitespace-pre">
{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&client_id={client_id}
&client_secret={client_secret}
&redirect_uri={redirect_uri}`}
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">2. Refresh Token</h4>
                  <code className="block bg-muted p-3 rounded text-sm overflow-x-auto whitespace-pre">
{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={client_id}
&client_secret={client_secret}`}
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Endpoints</CardTitle>
                <CardDescription>Read-only APIs (Phase 1)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET</Badge>
                    <code className="text-sm">/api/mailbox</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fetch user mailbox details including email address and storage info.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET</Badge>
                    <code className="text-sm">/api/mail/folders</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    List all folders (Inbox, Sent, Drafts, Spam, Trash) with unread counts.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET</Badge>
                    <code className="text-sm">/api/mail/messages</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    List email headers. Query params: folder, page, limit.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET</Badge>
                    <code className="text-sm">/api/mail/message/{"{id}"}</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fetch full email content including body and attachments.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET</Badge>
                    <code className="text-sm">/api/mail/search</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Search emails. Query params: keyword, sender, date_from, date_to.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scopes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">read:mailbox</Badge>
                    <span className="text-sm text-muted-foreground">
                      Access mailbox info and folder list
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">read:messages</Badge>
                    <span className="text-sm text-muted-foreground">
                      Read email messages and search
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Developers;
