import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, X, PenSquare, Menu, GripVertical, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { EmailSidebar } from "@/components/EmailSidebar";
import { EmailList } from "@/components/EmailList";
import { EmailViewer } from "@/components/EmailViewer";
import { EmailComposer } from "@/components/EmailComposer";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BottomTabBar, TabId } from "@/components/BottomTabBar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

interface ActiveSubscription {
  plan_id: string;
  status: string;
  current_period_end: string | null;
}

type PaymentConfirmationState = {
  status: "idle" | "checking" | "success" | "pending" | "error";
  message: string;
  reference?: string;
};

const MIN_LIST_WIDTH = 260;
const MAX_LIST_WIDTH = 600;
const DEFAULT_LIST_WIDTH = 340;

const formatPlanName = (planId?: string | null) => {
  if (!planId) return "subscription";
  return planId.charAt(0).toUpperCase() + planId.slice(1);
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [composerInitialBody, setComposerInitialBody] = useState<string | undefined>(undefined);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("mail");
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmationState>({
    status: "idle",
    message: "",
  });
  const [selectedEmailAddressId, setSelectedEmailAddressId] = useState<string | null>(() => {
    return localStorage.getItem("selectedEmailAddressId");
  });

  // Resizable list panel
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_LIST_WIDTH);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchActiveSubscription = useCallback(async (userId: string) => {
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              order: (column: string, options: { ascending: boolean }) => {
                limit: (count: number) => {
                  maybeSingle: () => Promise<{ data: ActiveSubscription | null; error: Error | null }>;
                };
              };
            };
          };
        };
      };
    };

    const { data, error } = await client
      .from("subscriptions")
      .select("plan_id,status,current_period_end")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) setActiveSubscription(data);
  }, []);

  useEffect(() => {
    if (selectedEmailAddressId) {
      localStorage.setItem("selectedEmailAddressId", selectedEmailAddressId);
    }
  }, [selectedEmailAddressId]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchEmailAddresses(session.user.id);
      }
    }).finally(() => {
      if (mounted) setInitializing(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setInitializing(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchActiveSubscription(user.id);
  }, [user, fetchActiveSubscription]);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const status = params.get("status");
    const reference = params.get("reference");
    let planId = params.get("plan");

    // Derive planId from SkyPay product_id (clientReference is "afuchat-{planId}-{uuid}")
    if (!planId) {
      const productId = params.get("product_id");
      const match = productId?.match(/^afuchat-(professional|business)-/);
      if (match) planId = match[1];
    }

    if (payment === "cancelled" || status === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "Your subscription was not changed.",
      });
      navigate("/pricing", { replace: true });
      return;
    }

    if (payment !== "success" && status !== "success") return;

    if (!reference || !planId) {
      setPaymentConfirmation({
        status: "pending",
        message: "SkyPay returned you safely, but we couldn't read the payment reference. Open Settings → Billing to check status manually.",
      });
      window.history.replaceState(null, "", "/dashboard");
      return;
    }

    let cancelled = false;
    let retryTimer: number | undefined;

    const confirmPayment = async (attempt = 1) => {
      setPaymentConfirmation({
        status: "checking",
        message: `Confirming your ${formatPlanName(planId)} payment with SkyPay...`,
        reference,
      });

      const { data, error } = await supabase.functions.invoke("skypay-confirm-payment", {
        body: { reference, planId },
      });

      if (cancelled) return;

      if (!error && data?.success) {
        setPaymentConfirmation({
          status: "success",
          message: `${formatPlanName(planId)} is active. Your payment has been verified by SkyPay.`,
          reference,
        });
        fetchActiveSubscription(user.id);
        window.history.replaceState(null, "", "/dashboard");
        return;
      }

      if ((data?.pending || error) && attempt < 8) {
        retryTimer = window.setTimeout(() => confirmPayment(attempt + 1), 3000);
        return;
      }

      setPaymentConfirmation({
        status: data?.pending ? "pending" : "error",
        message: data?.error || "SkyPay has not delivered the verified payment webhook yet. This will update automatically after the webhook is received.",
        reference,
      });
      window.history.replaceState(null, "", "/dashboard");
    };

    confirmPayment();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [user, fetchActiveSubscription, navigate, toast]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-count-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "emails", filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadCount(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedEmailAddressId]);

  useEffect(() => {
    if (user && selectedEmailAddressId) fetchUnreadCount(user.id);
  }, [user, selectedEmailAddressId]);

  const fetchEmailAddresses = async (userId: string) => {
    const { data } = await supabase
      .from("email_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setEmailAddresses(data || []);
  };

  const fetchUnreadCount = async (userId: string) => {
    if (!selectedEmailAddressId) return;
    let query = supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (selectedEmailAddressId !== "all") {
      query = query.eq("email_address_id", selectedEmailAddressId);
    }
    const { count, error } = await query;
    if (!error && count !== null) setUnreadCount(count);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "mail") { setSelectedEmail(null); setSearchQuery(""); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") return;
      if (showComposer) return;

      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          setShowComposer(true);
          break;
        case "escape":
          if (selectedEmail) {
            e.preventDefault();
            setSelectedEmail(null);
            setRefreshTrigger(p => p + 1);
          }
          break;
        case "r":
          if (selectedEmail) {
            e.preventDefault();
            setShowComposer(true);
          }
          break;
        case "/":
          e.preventDefault();
          setActiveTab("search");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showComposer, selectedEmail]);

  // Resize handler
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = listWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientX - startXRef.current;
      const newWidth = Math.max(MIN_LIST_WIDTH, Math.min(MAX_LIST_WIDTH, startWidthRef.current + delta));
      setListWidth(newWidth);
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [listWidth]);

  const handleEmailSelect = useCallback((email: Email) => {
    setSelectedEmail(email);
    setActiveTab("mail");
  }, []);

  const handleEmailBack = useCallback(() => {
    setSelectedEmail(null);
  }, []);

  const handleReply = useCallback((initialBody?: string) => {
    setComposerInitialBody(initialBody);
    setShowComposer(true);
  }, []);

  const handleComposerClose = useCallback(() => {
    setShowComposer(false);
    setComposerInitialBody(undefined);
    setRefreshTrigger(p => p + 1);
  }, []);

  if (initializing) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col">
        <div className="h-14 border-b bg-card flex items-center px-4 gap-4">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-4 w-28" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-60 rounded hidden lg:block" />
          <Skeleton className="h-8 w-24 rounded hidden lg:block" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden lg:flex w-[var(--sidebar-width)] border-r bg-card flex-col gap-3 p-4">
            <Skeleton className="h-9 w-full rounded" />
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-9 w-full rounded" />)}
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="border rounded p-4 bg-card flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sidebarProps = {
    onCompose: () => setShowComposer(true),
    onFolderSelect: (folderId: string) => {
      setSelectedFolder(folderId);
      setSelectedEmail(null);
      setDrawerOpen(false);
    },
    selectedFolderId: selectedFolder,
    selectedEmailAddressId,
    onEmailAddressChange: setSelectedEmailAddressId,
    userEmail: user?.email,
    activePlan: activeSubscription?.plan_id,
    onSignOut: handleSignOut,
  };

  const listProps = {
    folderId: selectedFolder,
    emailAddressId: selectedEmailAddressId,
    onEmailSelect: handleEmailSelect,
    refreshTrigger,
    searchQuery,
  };

  const viewerProps = selectedEmail ? {
    email: selectedEmail,
    onBack: handleEmailBack,
    onReply: handleReply,
  } : null;

  const paymentBannerIcon = paymentConfirmation.status === "success"
    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
    : paymentConfirmation.status === "error"
      ? <AlertCircle className="h-4 w-4 text-red-600" />
      : <Clock className="h-4 w-4 text-primary" />;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {activeSubscription && (
        <div className="border-b bg-primary/5 px-4 py-2 text-xs text-primary">
          Active plan: <span className="font-semibold">{formatPlanName(activeSubscription.plan_id)}</span>
          {activeSubscription.current_period_end && (
            <span className="text-muted-foreground"> · Renews {new Date(activeSubscription.current_period_end).toLocaleDateString()}</span>
          )}
        </div>
      )}

      {paymentConfirmation.status !== "idle" && (
        <div className="border-b bg-card px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-start gap-3 rounded-lg border bg-background px-3 py-2">
            {paymentBannerIcon}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{paymentConfirmation.message}</p>
              {paymentConfirmation.reference && (
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">SkyPay ref: {paymentConfirmation.reference}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPaymentConfirmation({ status: "idle", message: "" })}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* ── MOBILE / TABLET LAYOUT (< lg = < 1024px) ── */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden pb-14">

        {/* Mail Tab */}
        {activeTab === "mail" && (
          <div className="flex flex-col h-full">
            <header className="flex items-center gap-2 px-3 py-2.5 bg-card border-b sticky top-0 z-40">
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded flex-shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[var(--sidebar-width)] max-w-[85vw]" aria-describedby={undefined}>
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <EmailSidebar {...sidebarProps} />
                </SheetContent>
              </Sheet>

              <div
                className="flex-1 bg-muted rounded px-3 py-2 flex items-center gap-2 cursor-pointer"
                onClick={() => setActiveTab("search")}
              >
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Search mail…</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded flex-shrink-0"
                onClick={() => setShowComposer(true)}
              >
                <PenSquare className="h-[18px] w-[18px]" />
              </Button>
            </header>

            {selectedEmail ? (
              <div className="flex-1 overflow-y-auto scroll-smooth-ios">
                <EmailViewer {...viewerProps!} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto scroll-smooth-ios">
                <EmailList {...listProps} />
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="flex flex-col h-full">
            <header className="px-3 py-2.5 bg-card border-b sticky top-0 z-40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded bg-muted shadow-none border-0"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto scroll-smooth-ios">
              {searchQuery.trim() ? (
                <EmailList
                  {...listProps}
                  onEmailSelect={email => { handleEmailSelect(email); setActiveTab("mail"); }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full px-8 text-center text-muted-foreground">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Search your emails</p>
                  <p className="text-xs mt-1 opacity-60">Find by sender, subject, or content</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Tab Bar */}
        <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} unreadCount={unreadCount} />
      </div>

      {/* ── DESKTOP LAYOUT (>= lg = >= 1024px) ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">

        {/* Sidebar — fixed width */}
        <div className="flex-shrink-0 overflow-hidden border-r">
          <EmailSidebar {...sidebarProps} />
        </div>

        {/* Email List — resizable width when viewer is open */}
        <div
          className="flex flex-col border-r overflow-hidden flex-shrink-0"
          style={{ width: selectedEmail ? listWidth : undefined, flex: selectedEmail ? undefined : "1 1 0%" }}
        >
          {/* Desktop search + compose bar */}
          <div className="px-3 py-2.5 border-b bg-card flex items-center gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mail…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded bg-muted shadow-none border-0 text-sm"
              />
              {searchQuery && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button
              className="h-9 rounded font-medium text-sm shadow-none flex-shrink-0"
              onClick={() => setShowComposer(true)}
            >
              <PenSquare className="h-4 w-4 mr-1.5" />
              Compose
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            <EmailList {...listProps} />
          </div>
        </div>

        {/* Resize handle — only visible when email viewer is open */}
        {selectedEmail && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="w-1 flex-shrink-0 relative group cursor-col-resize bg-border hover:bg-primary/30 transition-colors duration-150 flex items-center justify-center"
            title="Drag to resize"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute" />
          </div>
        )}

        {/* Email Viewer Panel */}
        {selectedEmail && viewerProps && (
          <div className="flex-1 overflow-y-auto thin-scrollbar min-w-0">
            <EmailViewer {...viewerProps} />
          </div>
        )}

        {/* Empty placeholder — no email selected */}
        {!selectedEmail && (
          <div className="hidden" />
        )}
      </div>

      {/* Composer Modal */}
      {showComposer && selectedEmailAddressId && (
        <EmailComposer
          fromAddress={emailAddresses.find(e => e.id === selectedEmailAddressId)?.full_email}
          onClose={handleComposerClose}
          replyTo={selectedEmail ? {
            to: selectedEmail.from_address,
            subject: selectedEmail.subject,
            threadId: selectedEmail.thread_id || undefined,
            originalEmailId: selectedEmail.id,
          } : undefined}
          initialBody={composerInitialBody}
        />
      )}

      <PWAInstallPrompt />
    </div>
  );
};

export default Dashboard;
