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
import { ArrowLeft, Plus, Copy, Trash2, Key, Book, Shield, Pencil, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";

import { User } from "@supabase/supabase-js";

interface OAuthApp {
  id: string;
  name: string;
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { id: "openid", label: "OpenID Connect", description: "Enable OpenID authentication" },
  { id: "profile", label: "Profile", description: "Access user profile information" },
  { id: "email", label: "Email", description: "Access user's email address" },
  { id: "read:mailbox", label: "Read Mailbox", description: "Access mailbox info and folder list" },
  { id: "read:messages", label: "Read Messages", description: "Read email messages" },
  { id: "read:folders", label: "Read Folders", description: "Access folder structure" },
  { id: "search", label: "Search", description: "Search through emails" },
  { id: "write:messages", label: "Write Messages", description: "Send emails on behalf of user" },
  { id: "write:drafts", label: "Write Drafts", description: "Create, edit, and delete drafts" },
  { id: "modify:messages", label: "Modify Messages", description: "Mark read/unread, star, move, or delete messages" },
  { id: "manage:addresses", label: "Manage Addresses", description: "Create, update, or remove email addresses and aliases" },
  { id: "manage:folders", label: "Manage Folders", description: "Create, rename, or delete folders" },
];

const Developers = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [newAppName, setNewAppName] = useState("");
  const [newAppRedirectUri, setNewAppRedirectUri] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:mailbox", "read:messages"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<OAuthApp | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  // OAuth app creation is open to every signed-in AfuChat user — no plan gate.
  const canCreateApps = !!user;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

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
    if (!canCreateApps) {
      toast.error("Please sign in to create an OAuth application.");
      navigate("/auth");
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
        scopes: selectedScopes,
      });

    if (error) {
      console.error("Error creating app:", error);
      toast.error("Failed to create application");
    } else {
      toast.success("Application created successfully");
      setNewAppName("");
      setNewAppRedirectUri("");
      setSelectedScopes(["read:mailbox", "read:messages"]);
      setDialogOpen(false);
      fetchApps();
    }
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const toggleEditScope = (scopeId: string) => {
    setEditScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const openEditDialog = (app: OAuthApp) => {
    setEditingApp(app);
    setEditScopes([...app.scopes]);
    setEditDialogOpen(true);
  };

  const updateAppScopes = async () => {
    if (!editingApp) return;

    const { error } = await supabase
      .from("oauth_applications")
      .update({ scopes: editScopes })
      .eq("id", editingApp.id);

    if (error) {
      toast.error("Failed to update scopes");
    } else {
      toast.success("Scopes updated successfully");
      setEditDialogOpen(false);
      setEditingApp(null);
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Developer Portal</span>
          </div>
          <ThemeToggle />
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
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-sm font-semibold">Build with Sign in with AfuChat</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                OAuth 2.0 is open to every AfuChat user — register an app, request scopes, and let your users sign in with their AfuChat email.
              </p>
            </div>
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
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {AVAILABLE_SCOPES.map((scope) => (
                          <div key={scope.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={scope.id}
                              checked={selectedScopes.includes(scope.id)}
                              onCheckedChange={() => toggleScope(scope.id)}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={scope.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {scope.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {scope.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
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

              {/* Edit Scopes Dialog */}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Scopes</DialogTitle>
                    <DialogDescription>
                      Update the permissions for {editingApp?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                        {AVAILABLE_SCOPES.map((scope) => (
                          <div key={scope.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`edit-${scope.id}`}
                              checked={editScopes.includes(scope.id)}
                              onCheckedChange={() => toggleEditScope(scope.id)}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={`edit-${scope.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {scope.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {scope.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={updateAppScopes}>Save Changes</Button>
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(app)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteApp(app.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                <CardTitle>Available Scopes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope.id} className="flex items-start gap-3">
                      <Badge variant="outline">{scope.id}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {scope.description}
                      </span>
                    </div>
                  ))}
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
