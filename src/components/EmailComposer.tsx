import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Send, Paperclip, FileText, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailComposerProps {
  fromAddress: string;
  onClose: () => void;
  replyTo?: {
    to: string;
    subject: string;
    threadId?: string;
    originalEmailId?: string;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_text: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  path: string;
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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserSettings();
    fetchTemplates();
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

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject, body_text")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body_text);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // Check file size (10MB limit)
        if (file.size > 10485760) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("email-attachments")
          .upload(fileName, file);

        if (error) throw error;

        uploadedAttachments.push({
          id: data.path,
          name: file.name,
          size: file.size,
          path: data.path,
        });
      }

      setAttachments([...attachments, ...uploadedAttachments]);
      toast({
        title: "Files uploaded",
        description: `${uploadedAttachments.length} file(s) attached`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = async (attachment: Attachment) => {
    try {
      const { error } = await supabase.storage
        .from("email-attachments")
        .remove([attachment.path]);

      if (error) throw error;

      setAttachments(attachments.filter(a => a.id !== attachment.id));
      toast({
        title: "Attachment removed",
      });
    } catch (error: any) {
      toast({
        title: "Failed to remove attachment",
        description: error.message,
        variant: "destructive",
      });
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
      // Verify we have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("Current session:", { 
        hasSession: !!session, 
        userId: session?.user?.id,
        accessToken: session?.access_token ? "present" : "missing"
      });

      if (sessionError || !session) {
        throw new Error("You must be logged in to send emails. Please refresh the page and try again.");
      }

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

      const attachmentData = attachments.map(att => ({
        name: att.name,
        size: att.size,
        path: att.path,
      }));

      console.log("Calling send-email function...");

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          from_address: fromAddress,
          to_addresses: toAddresses,
          cc_addresses: ccAddresses,
          bcc_addresses: bccAddresses,
          subject,
          body_html: fullBodyHtml,
          body_text: fullBody,
          reply_to: defaultReplyTo || undefined,
          attachments: attachmentData,
          thread_id: replyTo?.threadId || undefined,
          in_reply_to: replyTo?.originalEmailId || undefined,
        },
      });

      console.log("Send email response:", { data, error });

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

        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Use a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

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

          {/* Attachments Display */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Attachments ({attachments.length})</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">{attachment.name}</span>
                    <span className="text-muted-foreground">
                      ({(attachment.size / 1024).toFixed(1)}KB)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleRemoveAttachment(attachment)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-muted/50">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
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
