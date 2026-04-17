import { Button } from "@/components/ui/button";
import { ArrowLeft, Reply, Star, Trash2, Download, Paperclip, FileText, Clock, ChevronDown, ChevronUp, Undo2, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SnoozeDialog } from "./SnoozeDialog";
import DOMPurify from "dompurify";
import { linkifyText } from "@/lib/linkify";
import { useAIEmailAssist } from "@/hooks/useAIEmailAssist";

interface Attachment {
  name: string;
  size: number;
  path: string;
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
  folder_id?: string;
  original_folder_id?: string | null;
  thread_id?: string | null;
  attachments?: Attachment[];
  created_at?: string;
}

interface EmailViewerProps {
  email: Email;
  onBack: () => void;
  onReply: (initialBody?: string) => void;
}

const normalizeAttachments = (attachments: unknown): Attachment[] => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) {
    return attachments
      .filter((attachment): attachment is Attachment => {
        const value = attachment as Attachment;
        return !!value?.name && typeof value.path === "string";
      })
      .map((attachment) => ({
        name: attachment.name,
        size: Number(attachment.size) || 0,
        path: attachment.path,
      }));
  }
  if (typeof attachments === "string") {
    try {
      return normalizeAttachments(JSON.parse(attachments));
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeEmail = (value: Email): Email => ({
  ...value,
  attachments: normalizeAttachments(value.attachments),
});

const sanitizeEmailHtml = (html: string) =>
  DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    ALLOWED_TAGS: [
      "a", "p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "pre", "code", "div", "span", "img",
      "table", "thead", "tbody", "tfoot", "tr", "td", "th", "button"
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "role", "aria-label", "colspan", "rowspan"],
  });

export const EmailViewer = ({ email, onBack, onReply }: EmailViewerProps) => {
  const { toast } = useToast();
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set([email.id]));
  const [isTrashFolder, setIsTrashFolder] = useState(false);
  const { loading: aiLoading, smartReplies, getSmartReplies } = useAIEmailAssist();

  useEffect(() => {
    if (!email.is_read) {
      markAsRead();
    }
    if (email.thread_id) {
      fetchThreadEmails();
    } else {
      setThreadEmails([normalizeEmail(email)]);
    }
    checkIfTrashFolder();
  }, [email.id]);

  const checkIfTrashFolder = async () => {
    if (!email.folder_id) {
      setIsTrashFolder(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: folder } = await supabase
        .from("folders")
        .select("type")
        .eq("id", email.folder_id)
        .single();

      setIsTrashFolder(folder?.type === "trash");
    } catch (error) {
      console.error("Error checking folder type:", error);
    }
  };

  const fetchThreadEmails = async () => {
    if (!email.thread_id) return;
    
    setLoadingThread(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("thread_id", email.thread_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Cast attachments to proper type
      const typedEmails = ((data || []) as unknown as Email[]).map(normalizeEmail);
      
      setThreadEmails(typedEmails.length > 0 ? typedEmails : [normalizeEmail(email)]);
    } catch (error: any) {
      console.error("Error fetching thread:", error);
      setThreadEmails([normalizeEmail(email)]);
    } finally {
      setLoadingThread(false);
    }
  };

  const markAsRead = async () => {
    try {
      const { error } = await supabase
        .from("emails")
        .update({ is_read: true })
        .eq("id", email.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error marking as read:", error);
    }
  };

  const toggleStar = async () => {
    try {
      const { error } = await supabase
        .from("emails")
        .update({ is_starred: !email.is_starred })
        .eq("id", email.id);

      if (error) throw error;
      
      toast({
        title: email.is_starred ? "Unstarred" : "Starred",
        description: "Email updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      });
    }
  };

  const deleteEmail = async () => {
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

      const isInTrash = email.folder_id === trashFolder.id;

      if (isInTrash) {
        // Permanently delete if already in trash
        const { error } = await supabase
          .from("emails")
          .delete()
          .eq("id", email.id);

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
            original_folder_id: email.folder_id,
            deleted_at: new Date().toISOString()
          })
          .eq("id", email.id);

        if (error) throw error;

        toast({
          title: "Moved to trash",
          description: "Email will be permanently deleted after 7 days",
        });
      }
      
      onBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const restoreEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!email.original_folder_id) {
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
          .eq("id", email.id);

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
          .eq("id", email.id);

        if (error) throw error;
      }

      toast({
        title: "Restored",
        description: "Email restored successfully",
      });
      
      onBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to restore email",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      if (!attachment.path) throw new Error("Attachment path is missing");
      const { data, error } = await supabase.storage
        .from("email-attachments")
        .download(attachment.path);

      if (error) throw error;
      if (!data) throw new Error("Attachment file was not returned");

      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: `${attachment.name} downloaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleEmailExpanded = (emailId: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-3 flex items-center justify-between bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setShowSnoozeDialog(true)}>
            <Clock className="h-4 w-4" />
          </Button>
          {!isTrashFolder && (
            <>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={toggleStar}>
                <Star className={`h-4 w-4 ${email.is_starred ? "fill-yellow-500 text-yellow-500" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => onReply()}>
                <Reply className="h-4 w-4" />
              </Button>
            </>
          )}
          {isTrashFolder && (
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={restoreEmail} title="Restore">
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className={`rounded-xl ${isTrashFolder ? "text-destructive hover:text-destructive" : ""}`}
            onClick={deleteEmail} title={isTrashFolder ? "Delete permanently" : "Move to trash"}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <SnoozeDialog
        open={showSnoozeDialog}
        onOpenChange={setShowSnoozeDialog}
        emailId={email.id}
        onSnooze={onBack}
      />

      <div className="flex-1 overflow-y-auto p-5 scroll-smooth-ios">
        <h1 className="text-xl font-bold mb-5">{email.subject}</h1>
        
        {/* Thread conversation view */}
        <div className="space-y-3">
          {threadEmails.map((threadEmail, index) => {
            const isExpanded = expandedEmails.has(threadEmail.id);
            const isLastEmail = index === threadEmails.length - 1;
            
            return (
              <div 
                key={threadEmail.id} 
                className={cn(
                  "border rounded transition-all bg-card",
                  isExpanded ? "shadow-md" : "shadow-xs cursor-pointer"
                )}
              >
                {/* Email header */}
                <div 
                  className="p-4 flex items-start justify-between gap-4"
                  onClick={() => !isExpanded && toggleEmailExpanded(threadEmail.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{threadEmail.from_address}</p>
                      {!isExpanded && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(threadEmail.sent_at || threadEmail.received_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <p className="text-sm text-muted-foreground">
                        to {threadEmail.to_addresses.join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">
                        {threadEmail.body_text?.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(threadEmail.sent_at || threadEmail.received_at), { addSuffix: true })}
                      </span>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEmailExpanded(threadEmail.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded email body */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="email-body mb-4">
                      {threadEmail.body_html ? (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: sanitizeEmailHtml(threadEmail.body_html)
                          }} 
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            const link = target.closest("a");
                            if (link?.href) {
                              e.preventDefault();
                              window.open(link.href, "_blank", "noopener,noreferrer");
                            }
                          }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans">
                          {linkifyText(threadEmail.body_text || '')}
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    {threadEmail.attachments && threadEmail.attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold">
                            {threadEmail.attachments.length} Attachment{threadEmail.attachments.length > 1 ? 's' : ''}
                          </h4>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {threadEmail.attachments.map((attachment, attachIndex) => (
                            <div
                              key={attachIndex}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="flex-shrink-0"
                                onClick={() => handleDownloadAttachment(attachment)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart replies + Reply button for last email in thread */}
                    {isLastEmail && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {/* Smart Reply Chips */}
                        {smartReplies.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {smartReplies.map((reply, i) => (
                              <button
                                key={i}
                                onClick={() => onReply(reply)}
                                className="text-sm px-3.5 py-2 rounded-full bg-accent text-accent-foreground hover:bg-primary/10 transition-colors font-medium"
                              >
                                {reply.length > 60 ? reply.slice(0, 57) + "..." : reply}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onReply()}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </Button>
                          {smartReplies.length === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-primary hover:text-primary"
                              onClick={() => getSmartReplies(
                                threadEmail.body_text || threadEmail.body_html || "",
                                email.subject,
                                threadEmail.from_address
                              )}
                              disabled={aiLoading}
                            >
                              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                              Smart Reply
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
