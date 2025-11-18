import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Send, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerProps {
  fromAddress: string;
  onClose: () => void;
  replyTo?: {
    to: string;
    subject: string;
  };
}

export const EmailComposer = ({ fromAddress, onClose, replyTo }: EmailComposerProps) => {
  const [to, setTo] = useState(replyTo?.to || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [signature, setSignature] = useState("");
  const [defaultReplyTo, setDefaultReplyTo] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("email_signature, default_reply_to")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching settings:", error);
        return;
      }

      if (data) {
        setSignature(data.email_signature || "");
        setDefaultReplyTo(data.default_reply_to || "");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({
        title: "Missing fields",
        description: "Please fill in recipient, subject, and message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const toAddresses = to.split(",").map(email => email.trim());
      const ccAddresses = cc ? cc.split(",").map(email => email.trim()) : [];
      const bccAddresses = bcc ? bcc.split(",").map(email => email.trim()) : [];

      // Add signature to body if available
      const fullBody = signature 
        ? `${body}\n\n${signature}`
        : body;

      const fullBodyHtml = signature
        ? `<p>${body.replace(/\n/g, "<br>")}</p><br><p>${signature.replace(/\n/g, "<br>")}</p>`
        : `<p>${body.replace(/\n/g, "<br>")}</p>`;

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          from_address: fromAddress,
          to_addresses: toAddresses,
          cc_addresses: ccAddresses,
          bcc_addresses: bccAddresses,
          subject,
          body_html: fullBodyHtml,
          body_text: fullBody,
          reply_to: defaultReplyTo || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "Your email has been sent successfully",
      });
      onClose();
    } catch (error: any) {
      console.error("Send error:", error);
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-cyan-500/10">
          <h2 className="text-lg font-semibold">New Message</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" value={fromAddress} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="flex-1">To</Label>
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Bcc
                </button>
              )}
            </div>
            <Input
              id="to"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {showCc && (
            <div className="space-y-2">
              <Label htmlFor="cc">Cc</Label>
              <Input
                id="cc"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          )}

          {showBcc && (
            <div className="space-y-2">
              <Label htmlFor="bcc">Bcc</Label>
              <Input
                id="bcc"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Type your message here..."
              className="min-h-[300px] resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-muted/50">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
