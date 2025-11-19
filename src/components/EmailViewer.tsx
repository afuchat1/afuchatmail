import { Button } from "@/components/ui/button";
import { ArrowLeft, Reply, Star, Trash2, Download, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

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
  attachments?: Attachment[];
}

interface EmailViewerProps {
  email: Email;
  onBack: () => void;
  onReply: () => void;
}

export const EmailViewer = ({ email, onBack, onReply }: EmailViewerProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!email.is_read) {
      markAsRead();
    }
  }, [email.id]);

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
      const { error } = await supabase
        .from("emails")
        .delete()
        .eq("id", email.id);

      if (error) throw error;
      
      toast({
        title: "Deleted",
        description: "Email moved to trash",
      });
      onBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("email-attachments")
        .download(attachment.path);

      if (error) throw error;

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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center justify-between bg-gradient-to-r from-primary/5 to-cyan-500/5">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleStar}>
            <Star
              className={`h-4 w-4 ${
                email.is_starred ? "fill-yellow-500 text-yellow-500" : ""
              }`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={onReply}>
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={deleteEmail}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{email.subject}</h1>
        
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{email.from_address}</p>
              <p className="text-sm text-muted-foreground">
                to {email.to_addresses.join(", ")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(email.sent_at || email.received_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          {email.body_html ? (
            <div dangerouslySetInnerHTML={{ __html: email.body_html }} />
          ) : (
            <pre className="whitespace-pre-wrap font-sans">{email.body_text}</pre>
          )}
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">{email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}</h3>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
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
      </div>
    </div>
  );
};
