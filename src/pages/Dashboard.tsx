import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, LogOut, Plus, Trash2, Copy, Settings as SettingsIcon, Menu, Search, Edit, User as UserIcon } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { EmailSidebar } from "@/components/EmailSidebar";
import { EmailList } from "@/components/EmailList";
import { EmailViewer } from "@/components/EmailViewer";
import { EmailComposer } from "@/components/EmailComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EmailAddress {
  id: string;
  local_part: string;
  full_email: string;
  is_primary: boolean;
  created_at: string;
}

interface Email {
  id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  is_starred: boolean;
  sent_at: string;
  received_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<EmailAddress[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchEmails(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchEmails = async (userId: string) => {
    const { data, error } = await supabase
      .from("email_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching emails",
        description: error.message,
      });
    } else {
      setEmails(data || []);
    }
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("email_addresses")
        .insert({
          user_id: user.id,
          local_part: newEmail.toLowerCase(),
        });

      if (error) throw error;

      toast({
        title: "Email created!",
        description: `${newEmail}@afuchat.com is now active.`,
      });

      setNewEmail("");
      fetchEmails(user.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating email",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("email_addresses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting email",
        description: error.message,
      });
    } else {
      toast({
        title: "Email deleted",
        description: "Your email address has been removed.",
      });
      fetchEmails(user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - Gmail Style */}
      <header className="md:hidden bg-background border-b sticky top-0 z-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <EmailSidebar
                onCompose={() => setShowComposer(true)}
                onFolderSelect={(folderId) => {
                  setSelectedFolder(folderId);
                  setSelectedEmail(null);
                }}
                selectedFolderId={selectedFolder}
              />
            </SheetContent>
          </Sheet>
          
          <div className="flex-1 bg-muted/50 rounded-full px-4 py-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search in mail" 
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground"
            />
          </div>
          
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.email?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:block bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              AfuChat Email
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-0 md:px-4 py-0 md:py-8 max-w-7xl">
        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="hidden md:grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="settings">Email Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-0 mt-0">
            {/* Mobile View */}
            <div className="md:hidden">
              <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                Primary
              </div>
              {selectedEmail ? (
                <EmailViewer
                  email={selectedEmail}
                  onBack={() => {
                    setSelectedEmail(null);
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  onReply={() => {
                    setShowComposer(true);
                  }}
                />
              ) : (
                <EmailList
                  folderId={selectedFolder}
                  onEmailSelect={setSelectedEmail}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>

            {/* Desktop View */}
            <Card className="hidden md:block border-blue-200 shadow-lg">
              <div className="flex h-[calc(100vh-16rem)]">
                <EmailSidebar
                  onCompose={() => setShowComposer(true)}
                  onFolderSelect={(folderId) => {
                    setSelectedFolder(folderId);
                    setSelectedEmail(null);
                  }}
                  selectedFolderId={selectedFolder}
                />
                
                <div className="flex-1 flex flex-col">
                  {selectedEmail ? (
                    <EmailViewer
                      email={selectedEmail}
                      onBack={() => {
                        setSelectedEmail(null);
                        setRefreshTrigger(prev => prev + 1);
                      }}
                      onReply={() => {
                        setShowComposer(true);
                      }}
                    />
                  ) : (
                    <EmailList
                      folderId={selectedFolder}
                      onEmailSelect={setSelectedEmail}
                      refreshTrigger={refreshTrigger}
                    />
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-8">
            <Card className="border-blue-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-900">Create New Email Address</CardTitle>
                <CardDescription>Choose your unique @afuchat.com email address</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Email Address</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="newEmail"
                          placeholder="yourname"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                          pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                          minLength={3}
                          maxLength={30}
                          required
                          className="pr-32"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          @afuchat.com
                        </span>
                      </div>
                      <Button type="submit" disabled={loading}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      3-30 characters, lowercase letters, numbers, dots, hyphens, and underscores
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-blue-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-900">Your Email Addresses</CardTitle>
                <CardDescription>
                  You have {emails.length} email address{emails.length !== 1 ? "es" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emails.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email addresses yet. Create your first one above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-900">{email.full_email}</p>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(email.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(email.full_email);
                              toast({
                                title: "Copied!",
                                description: "Email address copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmail(email.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Compose Button - Mobile Only */}
      <Button
        onClick={() => setShowComposer(true)}
        className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40"
        size="icon"
      >
        <Edit className="h-5 w-5" />
      </Button>

      {/* Bottom Navigation - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around items-center py-3">
          <Button variant="ghost" size="icon" className="relative">
            <Mail className="h-5 w-5" />
            {emails.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                23
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <UserIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Email Composer */}
      {showComposer && emails.length > 0 && (
        <EmailComposer
          fromAddress={emails[0].full_email}
          onClose={() => {
            setShowComposer(false);
            setRefreshTrigger(prev => prev + 1);
          }}
          replyTo={selectedEmail ? {
            to: selectedEmail.from_address,
            subject: selectedEmail.subject
          } : undefined}
        />
      )}
    </div>
  );
};

export default Dashboard;