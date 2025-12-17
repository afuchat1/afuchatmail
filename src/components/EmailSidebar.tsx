import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PenSquare, Inbox, Send, FileText, AlertCircle, Trash2, Shield } from "lucide-react";

import { EmailAddressSwitcher } from "./EmailAddressSwitcher";

interface Folder {
  id: string;
  name: string;
  type: string;
  icon: string;
}

interface EmailSidebarProps {
  onCompose: () => void;
  onFolderSelect: (folderId: string) => void;
  selectedFolderId: string | null;
  selectedEmailAddressId: string | null;
  onEmailAddressChange: (emailAddressId: string) => void;
}

export const EmailSidebar = ({ 
  onCompose, 
  onFolderSelect, 
  selectedFolderId,
  selectedEmailAddressId,
  onEmailAddressChange 
}: EmailSidebarProps) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFolders();
    checkAdminStatus();
  }, []);

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

      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
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
      setFolders(data || []);
      
      // Select inbox by default
      const inboxFolder = data?.find(f => f.type === "inbox");
      if (inboxFolder && !selectedFolderId) {
        onFolderSelect(inboxFolder.id);
      }
    } catch (error: any) {
      console.error("Error fetching folders:", error);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      inbox: Inbox,
      send: Send,
      "file-text": FileText,
      "alert-circle": AlertCircle,
      "trash-2": Trash2,
    };
    return icons[iconName] || Inbox;
  };

  return (
    <div className="w-64 border-r bg-card p-4 flex flex-col gap-4 h-full">
      <div className="flex-shrink-0">
        <EmailAddressSwitcher
          selectedEmailAddressId={selectedEmailAddressId}
          onEmailAddressChange={onEmailAddressChange}
        />
      </div>
      
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {folders.map((folder) => {
          const Icon = getIcon(folder.icon);
          return (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFolderId === folder.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{folder.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin Link */}
      {isAdmin && (
        <div className="flex-shrink-0 pt-2 border-t">
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent text-muted-foreground"
          >
            <Shield className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span className="truncate">Admin Panel</span>
          </button>
        </div>
      )}
    </div>
  );
};
