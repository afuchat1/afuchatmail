import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2, Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Email {
  id: string;
  user_id: string;
  folder_id: string;
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

interface EmailListProps {
  folderId: string | null;
  onEmailSelect: (email: Email) => void;
  refreshTrigger: number;
}

export const EmailList = ({ folderId, onEmailSelect, refreshTrigger }: EmailListProps) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
  }, [folderId, refreshTrigger]);

  // Real-time subscription for new emails
  useEffect(() => {
    const channel = supabase
      .channel('emails-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails'
        },
        async (payload) => {
          const newEmail = payload.new as Email;
          
          // Get current user to filter emails
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || newEmail.user_id !== user.id) return;
          
          // Only add email if it matches current folder or no folder is selected
          if (!folderId || newEmail.folder_id === folderId) {
            setEmails(prevEmails => [newEmail, ...prevEmails]);
            
            // Show toast notification for new inbox emails
            if (newEmail.folder_id === folderId) {
              toast({
                title: "New Email",
                description: `From: ${newEmail.from_address}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folderId, toast]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("emails")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Error",
        description: "Failed to load emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    try {
      const { error } = await supabase
        .from("emails")
        .update({ is_starred: !currentStarred })
        .eq("id", emailId);

      if (error) throw error;
      
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, is_starred: !currentStarred } : email
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      });
    }
  };

  const deleteEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("emails")
        .delete()
        .eq("id", emailId);

      if (error) throw error;
      
      setEmails(emails.filter(email => email.id !== emailId));
      toast({
        title: "Deleted",
        description: "Email moved to trash",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4 opacity-50" />
        <p>No emails in this folder</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {emails.map((email) => (
        <div
          key={email.id}
          className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors group ${
            !email.is_read ? "bg-primary/5" : ""
          }`}
          onClick={() => onEmailSelect(email)}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(email.id, email.is_starred);
              }}
              className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Star
                className={`h-4 w-4 ${
                  email.is_starred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                }`}
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {!email.is_read && <MailOpen className="h-4 w-4 text-primary" />}
                  <span className={`font-medium ${!email.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                    {email.from_address}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(email.sent_at || email.received_at), { addSuffix: true })}
                </span>
              </div>
              <h3 className={`text-sm mb-1 ${!email.is_read ? "font-semibold" : "font-normal"}`}>
                {email.subject}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {email.body_text}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                deleteEmail(email.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
