import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  PenSquare, Inbox, Send, FileText, AlertCircle, Trash2,
  Shield, Star, Settings, LogOut, ChevronDown, ChevronRight, Plus,
  Archive, Clock
} from "lucide-react";
import { EmailAddressSwitcher } from "./EmailAddressSwitcher";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Folder {
  id: string;
  name: string;
  type: string;
  icon: string;
}

// ─── Module-level caches ────────────────────────────────────────────────────
// Keep folders / admin / unread counts in memory so the drawer renders
// instantly on every reopen instead of flashing empty while refetching.
let foldersCache: Folder[] = [];
let isAdminCache = false;
const unreadCache = new Map<string, Record<string, number>>();

interface EmailSidebarProps {
  onCompose: () => void;
  onFolderSelect: (folderId: string) => void;
  selectedFolderId: string | null;
  selectedEmailAddressId: string | null;
  onEmailAddressChange: (emailAddressId: string) => void;
  userEmail?: string;
  activePlan?: string | null;
  onSignOut?: () => void;
}

const FOLDER_ICONS: Record<string, React.ElementType> = {
  inbox: Inbox,
  send: Send,
  sent: Send,
  "file-text": FileText,
  drafts: FileText,
  draft: FileText,
  "alert-circle": AlertCircle,
  spam: AlertCircle,
  "trash-2": Trash2,
  trash: Trash2,
  star: Star,
  starred: Star,
  archive: Archive,
  snooze: Clock,
  snoozed: Clock,
};

export const EmailSidebar = ({
  onCompose,
  onFolderSelect,
  selectedFolderId,
  selectedEmailAddressId,
  onEmailAddressChange,
  userEmail,
  activePlan,
  onSignOut,
}: EmailSidebarProps) => {
  const [folders, setFolders] = useState<Folder[]>(foldersCache);
  const [isAdmin, setIsAdmin] = useState(isAdminCache);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    () => unreadCache.get(selectedEmailAddressId ?? "all") ?? {}
  );
  const navigate = useNavigate();

  useEffect(() => {
    fetchFolders();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (folders.length > 0) {
      fetchUnreadCounts();
    }
  }, [folders, selectedEmailAddressId]);

  useEffect(() => {
    if (!selectedEmailAddressId) return;
    const channel = supabase
      .channel("sidebar-unread-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emails" },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEmailAddressId, folders]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const value = !!data;
      isAdminCache = value;
      setIsAdmin(value);
    } catch {}
  };

  const fetchFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (data || []) as Folder[];
      foldersCache = list;
      setFolders(list);
      const inboxFolder = list.find((f) => f.type === "inbox");
      if (inboxFolder && !selectedFolderId) {
        onFolderSelect(inboxFolder.id);
      }
    } catch {}
  };

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("emails")
        .select("folder_id")
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (selectedEmailAddressId && selectedEmailAddressId !== "all") {
        query = query.eq("email_address_id", selectedEmailAddressId);
      }

      const { data } = await query;
      if (!data) return;

      const counts: Record<string, number> = {};
      for (const email of data) {
        if (email.folder_id) {
          counts[email.folder_id] = (counts[email.folder_id] || 0) + 1;
        }
      }
      unreadCache.set(selectedEmailAddressId ?? "all", counts);
      setUnreadCounts(counts);
    } catch {}
  }, [selectedEmailAddressId]);

  const getIcon = (folder: Folder) => {
    return (
      FOLDER_ICONS[folder.type] ||
      FOLDER_ICONS[folder.icon] ||
      Inbox
    );
  };

  const folderLabel = (folder: Folder) => {
    const labelMap: Record<string, string> = {
      inbox: "Inbox",
      sent: "Sent",
      drafts: "Drafts",
      spam: "Spam",
      trash: "Trash",
    };
    return labelMap[folder.type] || folder.name;
  };

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "AC";

  const planLabel = activePlan
    ? `${activePlan.charAt(0).toUpperCase()}${activePlan.slice(1)}`
    : null;

  // Group folders into sections for a Customer.io-style sectioned nav
  const primaryTypes = ["inbox", "starred", "snoozed"];
  const sendTypes = ["sent", "drafts"];
  const manageTypes = ["archive", "spam", "trash"];
  const primary = folders.filter(f => primaryTypes.includes(f.type));
  const send = folders.filter(f => sendTypes.includes(f.type));
  const manage = folders.filter(f => manageTypes.includes(f.type));
  const other = folders.filter(
    f => !primaryTypes.includes(f.type) && !sendTypes.includes(f.type) && !manageTypes.includes(f.type)
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  );

  const renderFolder = (folder: Folder) => {
    const Icon = getIcon(folder);
    const isSelected = selectedFolderId === folder.id;
    const unread = unreadCounts[folder.id] || 0;
    return (
      <button
        key={folder.id}
        onClick={() => onFolderSelect(folder.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground font-semibold"
            : "text-foreground/75 font-medium hover:bg-muted hover:text-foreground"
        )}
        data-testid={`button-folder-${folder.type || folder.id}`}
      >
        <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", isSelected ? "text-primary" : "opacity-80")} />
        <span className="flex-1 truncate text-left">{folderLabel(folder)}</span>
        {unread > 0 && (
          <span
            className={cn(
              "text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            )}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full w-[var(--sidebar-width)] bg-card">
      {/* Brand + Account */}
      <div className="px-3 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#0052ff"/>
              <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[15px] font-bold tracking-tight">AfuChat Mail</span>
            {planLabel && (
              <Badge className="h-5 rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary hover:bg-primary/10">
                {planLabel}
              </Badge>
            )}
          </div>
          {userEmail && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-md hover:bg-muted p-1 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium truncate">{userEmail}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {planLabel ? `${planLabel} plan active` : "AfuChat Mail"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <EmailAddressSwitcher
          selectedEmailAddressId={selectedEmailAddressId}
          onEmailAddressChange={onEmailAddressChange}
        />

        <Button
          onClick={onCompose}
          className="w-full h-10 mt-3 rounded-md font-semibold text-[14px] gap-2 shadow-none"
          data-testid="button-sidebar-compose"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Sectioned navigation */}
      <nav className="flex-1 overflow-y-auto thin-scrollbar px-2 pb-3">
        {primary.length > 0 && (
          <>
            <SectionLabel>Mail</SectionLabel>
            <div className="space-y-0.5">{primary.map(renderFolder)}</div>
          </>
        )}
        {send.length > 0 && (
          <>
            <SectionLabel>Send</SectionLabel>
            <div className="space-y-0.5">{send.map(renderFolder)}</div>
          </>
        )}
        {manage.length > 0 && (
          <>
            <SectionLabel>Manage</SectionLabel>
            <div className="space-y-0.5">{manage.map(renderFolder)}</div>
          </>
        )}
        {other.length > 0 && (
          <>
            <SectionLabel>Folders</SectionLabel>
            <div className="space-y-0.5">{other.map(renderFolder)}</div>
          </>
        )}

        <SectionLabel>Workspace</SectionLabel>
        <div className="space-y-0.5">
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium text-foreground/75 hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="h-[18px] w-[18px] flex-shrink-0 opacity-80" />
            <span>Settings</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium text-foreground/75 hover:bg-muted hover:text-foreground transition-colors"
              data-testid="button-admin-panel"
            >
              <Shield className="h-[18px] w-[18px] flex-shrink-0 text-amber-500" />
              <span>Admin Panel</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};
