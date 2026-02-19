import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Menu, Search, Edit, X, PenSquare } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { EmailSidebar } from "@/components/EmailSidebar";
import { EmailList } from "@/components/EmailList";
import { EmailViewer } from "@/components/EmailViewer";
import { EmailComposer } from "@/components/EmailComposer";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BottomTabBar, TabId } from "@/components/BottomTabBar";
import Settings from "@/pages/Settings";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("mail");
  const [selectedEmailAddressId, setSelectedEmailAddressId] = useState<string | null>(() => {
    return localStorage.getItem('selectedEmailAddressId');
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedEmailAddressId) {
      localStorage.setItem('selectedEmailAddressId', selectedEmailAddressId);
    }
  }, [selectedEmailAddressId]);

  useEffect(() => {
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

  useEffect(() => {
    if (!user || !selectedEmailAddressId) return;
    const channel = supabase
      .channel('unread-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadCount(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedEmailAddressId]);

  const fetchEmails = async (userId: string) => {
    const { data, error } = await supabase
      .from("email_addresses").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) { toast({ variant: "destructive", title: "Error fetching emails", description: error.message }); }
    else { setEmails(data || []); }
  };

  const fetchUnreadCount = async (userId: string) => {
    if (!selectedEmailAddressId) return;
    const { count, error } = await supabase
      .from("emails").select("*", { count: 'exact', head: true })
      .eq("user_id", userId).eq("email_address_id", selectedEmailAddressId).eq("is_read", false);
    if (!error && count !== null) { setUnreadCount(count); }
  };

  useEffect(() => {
    if (user && selectedEmailAddressId) { fetchUnreadCount(user.id); }
  }, [user, selectedEmailAddressId]);

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("email_addresses").insert({ user_id: user.id, local_part: newEmail.toLowerCase() });
      if (error) throw error;
      toast({ title: "Email created!", description: `${newEmail}@afuchat.com is now active.` });
      setNewEmail("");
      fetchEmails(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error creating email", description: error.message });
    } finally { setLoading(false); }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("email_addresses").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Error deleting email", description: error.message }); }
    else { toast({ title: "Email deleted" }); fetchEmails(user.id); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "mail") { setSelectedEmail(null); setSearchQuery(""); }
  };

  // ── MAIL TAB ──
  const renderMailTab = () => (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-40">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
           <SheetContent side="left" className="p-0 w-[280px]" aria-describedby={undefined}>
             <SheetTitle className="sr-only">Navigation</SheetTitle>
            <EmailSidebar
              onCompose={() => { setShowComposer(true); setDrawerOpen(false); }}
              onFolderSelect={(folderId) => { setSelectedFolder(folderId); setSelectedEmail(null); setDrawerOpen(false); }}
              selectedFolderId={selectedFolder}
              selectedEmailAddressId={selectedEmailAddressId}
              onEmailAddressChange={setSelectedEmailAddressId}
            />
          </SheetContent>
        </Sheet>

        <div 
          className="flex-1 bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors hover:bg-muted/80"
          onClick={() => setActiveTab("search")}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search in mail</span>
        </div>

        <Avatar
          className="h-8 w-8 cursor-pointer ring-2 ring-border"
          onClick={() => setActiveTab("settings")}
        >
          <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
            {user?.email?.[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </header>

      {selectedEmail ? (
        <div className="flex-1 overflow-y-auto scroll-smooth-ios">
          <EmailViewer
            email={selectedEmail}
            onBack={() => { setSelectedEmail(null); setRefreshTrigger(prev => prev + 1); }}
            onReply={() => setShowComposer(true)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scroll-smooth-ios">
          <EmailList
            folderId={selectedFolder}
            emailAddressId={selectedEmailAddressId}
            onEmailSelect={setSelectedEmail}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {!selectedEmail && (
        <Button
          onClick={() => setShowComposer(true)}
          className="fixed bottom-20 right-4 h-14 px-5 rounded-2xl z-40 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        >
          <PenSquare className="h-5 w-5" />
          <span className="text-sm font-semibold">Compose</span>
        </Button>
      )}
    </div>
  );

  // ── SEARCH TAB ──
  const renderSearchTab = () => (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 bg-card border-b border-border sticky top-0 z-40">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border border-border bg-muted rounded-xl focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto scroll-smooth-ios">
        {searchQuery.trim() ? (
          <EmailList
            folderId={selectedFolder}
            emailAddressId={selectedEmailAddressId}
            onEmailSelect={(email) => { setSelectedEmail(email); setActiveTab("mail"); }}
            refreshTrigger={refreshTrigger}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-8">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm text-center font-medium">Search your emails</p>
            <p className="text-xs text-center mt-1 opacity-70">By sender, subject, or content</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── SETTINGS TAB ──
  const renderSettingsTab = () => (
    <div className="flex-1 overflow-y-auto scroll-smooth-ios pb-4">
      <Settings embedded />
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Desktop Header */}
      <header className="hidden md:block bg-card border-b border-border sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">AfuChat Mail</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-9 rounded-xl border-border bg-muted"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/settings")}>
              <Mail className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile tab content */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden pb-14">
        {activeTab === "mail" && renderMailTab()}
        {activeTab === "search" && renderSearchTab()}
        {activeTab === "settings" && renderSettingsTab()}
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-shrink-0 overflow-y-auto">
          <EmailSidebar
            onCompose={() => setShowComposer(true)}
            onFolderSelect={(folderId) => { setSelectedFolder(folderId); setSelectedEmail(null); }}
            selectedFolderId={selectedFolder}
            selectedEmailAddressId={selectedEmailAddressId}
            onEmailAddressChange={setSelectedEmailAddressId}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-l border-border">
          {selectedEmail ? (
            <div className="flex-1 overflow-y-auto">
              <EmailViewer
                email={selectedEmail}
                onBack={() => { setSelectedEmail(null); setRefreshTrigger(prev => prev + 1); }}
                onReply={() => setShowComposer(true)}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <EmailList
                folderId={selectedFolder}
                emailAddressId={selectedEmailAddressId}
                onEmailSelect={setSelectedEmail}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tab Bar - Mobile only */}
      <div className="md:hidden">
        <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} unreadCount={unreadCount} />
      </div>

      {showComposer && selectedEmailAddressId && (
        <EmailComposer
          fromAddress={emails.find(e => e.id === selectedEmailAddressId)?.full_email}
          onClose={() => { setShowComposer(false); setRefreshTrigger(prev => prev + 1); }}
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
