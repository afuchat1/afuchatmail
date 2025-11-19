import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2, Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

  // Helper function to get initials from email
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // Helper function to format time (Gmail style)
  const formatTime = (date: string) => {
    const emailDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(emailDate, 'HH:mm');
    }
    return format(emailDate, 'MMM dd');
  };

  // Helper function to count participants
  const getParticipantCount = (email: Email) => {
    const allAddresses = new Set([
      email.from_address,
      ...email.to_addresses
    ]);
    return allAddresses.size;
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
      {emails.map((email) => {
        const participantCount = getParticipantCount(email);
        const senderName = email.from_address.split('@')[0];
        const toAddresses = email.to_addresses.map(addr => addr.split('@')[0]).join(', ');
        
        return (
          <div
            key={email.id}
            onClick={() => onEmailSelect(email)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50",
              !email.is_read && "bg-accent/20"
            )}
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(email.from_address)}
              </AvatarFallback>
            </Avatar>
            
            {/* Email Content */}
            <div className="flex-1 min-w-0">
              {/* Sender and Time */}
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className={cn(
                  "text-sm truncate",
                  !email.is_read ? "font-bold text-foreground" : "font-normal text-foreground"
                )}>
                  {senderName}, {toAddresses}
                  {participantCount > 2 && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      {participantCount}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatTime(email.received_at || email.sent_at)}
                </span>
              </div>
              
              {/* Subject */}
              <div className={cn(
                "text-sm mb-1 truncate",
                !email.is_read ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                {email.subject}
              </div>
              
              {/* Preview */}
              <div className="text-sm text-muted-foreground truncate">
                {email.body_text?.substring(0, 100) || 'No preview available'}
              </div>
            </div>
            
            {/* Star Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(email.id, email.is_starred);
              }}
              className="h-8 w-8 flex-shrink-0"
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  email.is_starred ? "fill-yellow-400 text-yellow-400" : "text-border"
                )}
              />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
