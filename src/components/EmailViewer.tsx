import { Button } from "@/components/ui/button";
import { ArrowLeft, Reply, Star, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

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
      </div>
    </div>
  );
};
