import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2, Mail, MailOpen, CheckCheck, AlertCircle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Email {
  id: string;
  user_id: string;
  folder_id: string;
  email_address_id: string;
  original_folder_id?: string | null;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[] | null;
  subject: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  snoozed_until: string | null;
  sent_at: string;
  received_at: string;
  thread_id: string | null;
  created_at?: string;
}

interface EmailThread {
  thread_id: string;
  emails: Email[];
  latest_email: Email;
  unread_count: number;
}

interface EmailListProps {
  folderId: string | null;
  emailAddressId: string | null;
  onEmailSelect: (email: Email) => void;
  refreshTrigger: number;
  searchQuery?: string;
}

export const EmailList = ({ folderId, emailAddressId, onEmailSelect, refreshTrigger, searchQuery }: EmailListProps) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrashFolder, setIsTrashFolder] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
    checkIfTrashFolder();
  }, [folderId, emailAddressId, refreshTrigger, searchQuery]);

  const checkIfTrashFolder = async () => {
    if (!folderId) {
      setIsTrashFolder(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: folder } = await supabase
        .from("folders")
        .select("type")
        .eq("id", folderId)
        .single();

      setIsTrashFolder(folder?.type === "trash");
    } catch (error) {
      console.error("Error checking folder type:", error);
    }
  };

  useEffect(() => {
    // Group emails into threads
    groupEmailsIntoThreads(emails);
  }, [emails]);

  // Real-time subscription for new emails
  useEffect(() => {
    if (!emailAddressId) return;

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
          
          // Only add email if it matches current email address and folder
          if (newEmail.email_address_id !== emailAddressId) return;
          
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
  }, [folderId, emailAddressId, toast]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Don't fetch if no email address is selected
      if (!emailAddressId) {
        setEmails([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("email_address_id", emailAddressId)
        .order("created_at", { ascending: false });

      if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredEmails = data || [];
      
      // Apply search filter if searchQuery exists
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();
        filteredEmails = filteredEmails.filter(email => 
          email.subject.toLowerCase().includes(searchLower) ||
          email.from_address.toLowerCase().includes(searchLower) ||
          email.body_text?.toLowerCase().includes(searchLower) ||
          email.to_addresses.some((addr: string) => addr.toLowerCase().includes(searchLower))
        );
      }
      
      setEmails(filteredEmails);
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

  const groupEmailsIntoThreads = (emailList: Email[]) => {
    const threadMap = new Map<string, Email[]>();
    const emailIdSet = new Set(emailList.map(e => e.id));

    // First pass: collect all thread IDs that are being used
    const activeThreadIds = new Set<string>();
    emailList.forEach(email => {
      if (email.thread_id) {
        activeThreadIds.add(email.thread_id);
      }
    });

    // Group emails by thread_id or by their own ID if they're a thread parent
    emailList.forEach(email => {
      if (email.thread_id) {
        // Email is part of a thread
        const existing = threadMap.get(email.thread_id) || [];
        threadMap.set(email.thread_id, [...existing, email]);
      } else if (activeThreadIds.has(email.id)) {
        // Email's ID is being used as a thread_id by other emails, so it's a thread parent
        const existing = threadMap.get(email.id) || [];
        threadMap.set(email.id, [...existing, email]);
      } else {
        // Truly standalone email - use its own ID as thread identifier
        threadMap.set(email.id, [email]);
      }
    });

    // Create thread objects
    const threadList: EmailThread[] = [];

    threadMap.forEach((threadEmails, threadId) => {
      const sortedEmails = threadEmails.sort((a, b) => 
        new Date(b.created_at || b.received_at || b.sent_at).getTime() - 
        new Date(a.created_at || a.received_at || a.sent_at).getTime()
      );
      
      const unreadCount = sortedEmails.filter(e => !e.is_read).length;
      
      threadList.push({
        thread_id: threadId,
        emails: sortedEmails,
        latest_email: sortedEmails[0],
        unread_count: unreadCount,
      });
    });

    // Sort threads by latest email date
    threadList.sort((a, b) => {
      const dateA = new Date(a.latest_email.created_at || a.latest_email.received_at || a.latest_email.sent_at).getTime();
      const dateB = new Date(b.latest_email.created_at || b.latest_email.received_at || b.latest_email.sent_at).getTime();
      return dateB - dateA;
    });

    setThreads(threadList);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get trash folder
      const { data: trashFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "trash")
        .single();

      if (!trashFolder) {
        throw new Error("Trash folder not found");
      }

      // Get the email to check if it's already in trash
      const email = emails.find(e => e.id === emailId);
      const isInTrash = email?.folder_id === trashFolder.id;

      if (isInTrash) {
        // Permanently delete if already in trash
        const { error } = await supabase
          .from("emails")
          .delete()
          .eq("id", emailId);

        if (error) throw error;

        toast({
          title: "Permanently deleted",
          description: "Email permanently removed",
        });
      } else {
        // Move to trash and save original folder for restore
        const { error } = await supabase
          .from("emails")
          .update({ 
            folder_id: trashFolder.id,
            original_folder_id: email?.folder_id,
            deleted_at: new Date().toISOString()
          })
          .eq("id", emailId);

        if (error) throw error;

        toast({
          title: "Moved to trash",
          description: "Email will be permanently deleted after 7 days",
        });
      }
      
      setEmails(emails.filter(email => email.id !== emailId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const restoreEmail = async (emailId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the email to find its original folder
      const email = emails.find(e => e.id === emailId);
      
      if (!email?.original_folder_id) {
        // If no original folder, restore to inbox
        const { data: inboxFolder } = await supabase
          .from("folders")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "inbox")
          .single();

        if (!inboxFolder) {
          throw new Error("Inbox folder not found");
        }

        const { error } = await supabase
          .from("emails")
          .update({ 
            folder_id: inboxFolder.id,
            deleted_at: null,
            original_folder_id: null
          })
          .eq("id", emailId);

        if (error) throw error;
      } else {
        // Restore to original folder
        const { error } = await supabase
          .from("emails")
          .update({ 
            folder_id: email.original_folder_id,
            deleted_at: null,
            original_folder_id: null
          })
          .eq("id", emailId);

        if (error) throw error;
      }

      toast({
        title: "Restored",
        description: "Email restored successfully",
      });
      
      setEmails(emails.filter(e => e.id !== emailId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to restore email",
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

  const getParticipantCount = (email: Email): number => {
    const allAddresses = new Set([
      email.from_address,
      ...email.to_addresses,
      ...(email.cc_addresses || []),
    ]);
    return allAddresses.size;
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const query = supabase
        .from("emails")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (folderId) {
        query.eq("folder_id", folderId);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: "All emails marked as read",
      });

      // Refresh the email list
      fetchEmails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error marking emails as read",
        description: error.message,
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get trash folder
      const { data: trashFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "trash")
        .single();

      if (!trashFolder) {
        throw new Error("Trash folder not found");
      }

      const isInTrash = folderId === trashFolder.id;

      if (isInTrash) {
        // Permanently delete all emails in trash
        const { error } = await supabase
          .from("emails")
          .delete()
          .eq("user_id", user.id)
          .eq("folder_id", folderId);

        if (error) throw error;

        toast({
          title: "Permanently deleted",
          description: "All emails permanently removed",
        });
      } else {
        // Move all emails to trash with original folder saved
        const emailsToUpdate = emails.map(email => ({
          id: email.id,
          folder_id: trashFolder.id,
          original_folder_id: email.folder_id,
          deleted_at: new Date().toISOString()
        }));

        for (const emailUpdate of emailsToUpdate) {
          await supabase
            .from("emails")
            .update({
              folder_id: emailUpdate.folder_id,
              original_folder_id: emailUpdate.original_folder_id,
              deleted_at: emailUpdate.deleted_at
            })
            .eq("id", emailUpdate.id);
        }

        toast({
          title: "Moved to trash",
          description: "All emails will be permanently deleted after 7 days",
        });
      }

      // Refresh the email list
      fetchEmails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting emails",
        description: error.message,
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

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4 opacity-50" />
        <p>No emails in this folder</p>
      </div>
    );
  }

  const hasUnreadEmails = threads.some(thread => thread.unread_count > 0);

  return (
    <div className="divide-y">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="text-sm font-medium">
          {threads.length} conversation{threads.length !== 1 ? 's' : ''}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bulk Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasUnreadEmails && (
              <DropdownMenuItem onClick={handleMarkAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={handleDeleteAll}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {threads.map((thread) => {
        const email = thread.latest_email;
        const participantCount = getParticipantCount(email);
        const senderName = email.from_address.split('@')[0];
        const toAddresses = email.to_addresses.map(addr => addr.split('@')[0]).join(', ');
        const hasMultipleEmails = thread.emails.length > 1;
        
        return (
          <div
            key={thread.thread_id}
            onClick={() => onEmailSelect(email)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50",
              thread.unread_count > 0 && "bg-accent/20"
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
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={cn(
                    "text-sm truncate",
                    thread.unread_count > 0 ? "font-bold text-foreground" : "font-normal text-foreground"
                  )}>
                    {senderName}, {toAddresses}
                    {participantCount > 2 && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        {participantCount}
                      </span>
                    )}
                    {hasMultipleEmails && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({thread.emails.length})
                      </span>
                    )}
                  </span>
                  {email.is_important && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-xs flex-shrink-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Important
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatTime(email.received_at || email.sent_at)}
                </span>
              </div>
              
              {/* Subject */}
              <div className={cn(
                "text-sm mb-1 truncate",
                thread.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                {email.subject}
              </div>
              
              {/* Preview */}
              <div className="text-sm text-muted-foreground truncate">
                {email.body_text?.substring(0, 100) || 'No preview available'}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isTrashFolder ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreEmail(email.id);
                    }}
                    className="h-8 w-8"
                    title="Restore"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEmail(email.id);
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(email.id, email.is_starred);
                  }}
                  className="h-8 w-8"
                >
                  <Star
                    className={`h-4 w-4 ${
                      email.is_starred ? "fill-yellow-500 text-yellow-500" : ""
                    }`}
                  />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
