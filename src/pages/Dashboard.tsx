import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, LogOut, Plus, Trash2, Copy, Settings as SettingsIcon, Menu, Search, Edit, User as UserIcon, ArrowLeft } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { EmailSidebar } from "@/components/EmailSidebar";
import { EmailList } from "@/components/EmailList";
import { EmailViewer } from "@/components/EmailViewer";
import { EmailComposer } from "@/components/EmailComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

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
  thread_id: string | null;
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
        fetchUnreadCount(session.user.id);
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

  // Real-time subscription for unread count updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emails',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  const fetchUnreadCount = async (userId: string) => {
    const { count, error } = await supabase
      .from("emails")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
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
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - Gmail Style */}
      <header className="md:hidden bg-background border-b sticky top-0 z-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <EmailSidebar
                onCompose={() => {
                  setShowComposer(true);
                  setDrawerOpen(false);
                }}
                onFolderSelect={(folderId) => {
                  setSelectedFolder(folderId);
                  setSelectedEmail(null);
                  setDrawerOpen(false); // Close drawer immediately
                }}
                selectedFolderId={selectedFolder}
              />
            </SheetContent>
          </Sheet>
          
          <div 
            className="flex-1 bg-muted/50 rounded-full px-4 py-2 flex items-center gap-2 cursor-pointer"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search in mail</span>
          </div>
          
          <Avatar 
            className="h-10 w-10 cursor-pointer"
            onClick={() => navigate("/settings")}
          >
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
        {/* Mobile View */}
        <div className="md:hidden">
          {showSearch ? (
            <div className="fixed inset-0 bg-background z-50">
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
              </div>
              <EmailList
                folderId={selectedFolder}
                onEmailSelect={(email) => {
                  setSelectedEmail(email);
                  setShowSearch(false);
                }}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
              />
            </div>
          ) : selectedEmail ? (
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
            <>
              <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                Primary
              </div>
              <EmailList
                folderId={selectedFolder}
                onEmailSelect={setSelectedEmail}
                refreshTrigger={refreshTrigger}
              />
            </>
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
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/settings")}
          >
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
            subject: selectedEmail.subject,
            threadId: selectedEmail.thread_id || undefined,
            originalEmailId: selectedEmail.id,
          } : undefined}
        />
      )}

      <PWAInstallPrompt />
    </div>
  );
};

export default Dashboard;