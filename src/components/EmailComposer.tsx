import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Send, Paperclip, FileText, Clock, Sparkles, Wand2, CheckCheck, ArrowDownToLine, ArrowUpToLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAIEmailAssist } from "@/hooks/useAIEmailAssist";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
  fromAddress?: string;
  onClose: () => void;
  replyTo?: {
    to: string;
    subject: string;
    threadId?: string;
    originalEmailId?: string;
  };
  initialBody?: string;
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

export const EmailComposer = ({ fromAddress: propFromAddress, onClose, replyTo, initialBody }: EmailComposerProps) => {
  const [fromAddress, setFromAddress] = useState(propFromAddress || "");
  const [userEmails, setUserEmails] = useState<Array<{ id: string; full_email: string }>>([]);
  const [to, setTo] = useState(replyTo?.to || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : "");
  const [body, setBody] = useState(initialBody || "");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [signature, setSignature] = useState("");
  const [defaultReplyTo, setDefaultReplyTo] = useState("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [showSchedule, setShowSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const {
    loading: aiLoading,
    autocompleteText,
    getAutocomplete,
    improveTone,
    fixGrammar,
    makeShorter,
    makeLonger,
    clearAutocomplete,
  } = useAIEmailAssist();

  useEffect(() => {
    fetchUserEmails();
    fetchUserSettings();
    fetchTemplates();
  }, []);

  // Debounced autocomplete
  const handleBodyChange = useCallback(
    (newBody: string) => {
      setBody(newBody);
      clearAutocomplete();
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
      autocompleteTimerRef.current = setTimeout(() => {
        if (newBody.length > 15) {
          getAutocomplete(newBody, subject);
        }
      }, 1500);
    },
    [subject, getAutocomplete, clearAutocomplete]
  );

  const acceptAutocomplete = () => {
    if (autocompleteText) {
      setBody((prev) => prev + " " + autocompleteText);
      clearAutocomplete();
    }
  };

  const handleAIAction = async (action: "improve_tone" | "fix_grammar" | "make_shorter" | "make_longer") => {
    if (!body.trim()) {
      toast({ title: "No content", description: "Write something first", variant: "destructive" });
      return;
    }
    let result: string | null = null;
    switch (action) {
      case "improve_tone": result = await improveTone(body); break;
      case "fix_grammar": result = await fixGrammar(body); break;
      case "make_shorter": result = await makeShorter(body); break;
      case "make_longer": result = await makeLonger(body); break;
    }
    if (result) setBody(result);
  };

  const fetchUserEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("email_addresses")
        .select("id, full_email, is_primary")
        .eq("user_id", user.id)
        .eq("is_alias", false)
        .order("is_primary", { ascending: false });
      if (error) return;
      if (data && data.length > 0) {
        setUserEmails(data);
        if (propFromAddress) { setFromAddress(propFromAddress); }
        else {
          const primaryEmail = data.find(e => e.is_primary);
          setFromAddress(primaryEmail?.full_email || data[0].full_email);
        }
      }
    } catch (error) { /* silent */ }
  };

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emailAddresses } = await supabase
        .from("email_addresses").select("id").eq("full_email", fromAddress).eq("user_id", user.id).single();
      if (!emailAddresses) return;
      const { data } = await supabase
        .from("user_settings").select("email_signature, default_reply_to").eq("email_address_id", emailAddresses.id).maybeSingle();
      if (data) {
        setSignature(data.email_signature || "");
        setDefaultReplyTo(data.default_reply_to || "");
      }
    } catch (error) { /* silent */ }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase.from("email_templates").select("id, name, subject, body_text").order("name");
      setTemplates(data || []);
    } catch (error) { /* silent */ }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) { setSubject(template.subject); setBody(template.body_text); }
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
        if (file.size > 10485760) {
          toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" });
          continue;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabase.storage.from("email-attachments").upload(fileName, file);
        if (error) throw error;
        uploadedAttachments.push({ id: data.path, name: file.name, size: file.size, path: data.path });
      }
      setAttachments([...attachments, ...uploadedAttachments]);
      toast({ title: "Files uploaded", description: `${uploadedAttachments.length} file(s) attached` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = async (attachment: Attachment) => {
    try {
      const { error } = await supabase.storage.from("email-attachments").remove([attachment.path]);
      if (error) throw error;
      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (error: any) {
      toast({ title: "Failed to remove attachment", description: error.message, variant: "destructive" });
    }
  };

  const getSchedulePresets = () => {
    const now = new Date();
    const tomorrow9am = new Date(now);
    tomorrow9am.setDate(tomorrow9am.getDate() + 1);
    tomorrow9am.setHours(9, 0, 0, 0);
    const mondayMorning = new Date(now);
    const dayOfWeek = mondayMorning.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    mondayMorning.setDate(mondayMorning.getDate() + daysUntilMonday);
    mondayMorning.setHours(9, 0, 0, 0);
    const laterToday = new Date(now);
    laterToday.setHours(laterToday.getHours() + 2);
    laterToday.setMinutes(0, 0, 0);
    return [
      { label: "Later today", time: laterToday },
      { label: "Tomorrow morning", time: tomorrow9am },
      { label: "Monday morning", time: mondayMorning },
    ];
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({ title: "Missing fields", description: "Please fill in recipient, subject, and message", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("You must be logged in to send emails.");
      const toAddresses = to.split(",").map(email => email.trim());
      const ccAddresses = cc ? cc.split(",").map(email => email.trim()) : [];
      const bccAddresses = bcc ? bcc.split(",").map(email => email.trim()) : [];
      const fullBody = signature ? `${body}\n\n${signature}` : body;
      const fullBodyHtml = signature
        ? `<p>${body.replace(/\n/g, "<br>")}</p><br><p>${signature.replace(/\n/g, "<br>")}</p>`
        : `<p>${body.replace(/\n/g, "<br>")}</p>`;
      const attachmentData = attachments.map(att => ({ name: att.name, size: att.size, path: att.path }));

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
          scheduled_at: scheduledAt || undefined,
        },
      });

      if (error) throw error;

      if (scheduledAt) {
        const schedDate = new Date(scheduledAt);
        toast({ title: "Email scheduled!", description: `Will be sent ${schedDate.toLocaleDateString()} at ${schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` });
      } else {
        toast({ title: "Email sent!", description: "Your email has been sent successfully" });
      }
      onClose();
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden max-h-[95dvh] md:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">New Message</h2>
            {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-[250px] rounded-xl">
                  <SelectValue placeholder="Use a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4 flex-1 overflow-y-auto scroll-smooth-ios">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</Label>
            <Select value={fromAddress} onValueChange={setFromAddress}>
              <SelectTrigger id="from" className="w-full rounded-xl border-border">
                <SelectValue placeholder="Select email address" />
              </SelectTrigger>
              <SelectContent>
                {userEmails.map((email) => (
                  <SelectItem key={email.id} value={email.full_email}>{email.full_email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</Label>
              {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-primary font-semibold">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-primary font-semibold">Bcc</button>}
            </div>
            <Input id="to" placeholder="recipient@example.com" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border-border" />
          </div>

          {showCc && (
            <div className="space-y-1.5">
              <Label htmlFor="cc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cc</Label>
              <Input id="cc" placeholder="cc@example.com" value={cc} onChange={(e) => setCc(e.target.value)} className="rounded-xl border-border" />
            </div>
          )}
          {showBcc && (
            <div className="space-y-1.5">
              <Label htmlFor="bcc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bcc</Label>
              <Input id="bcc" placeholder="bcc@example.com" value={bcc} onChange={(e) => setBcc(e.target.value)} className="rounded-xl border-border" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</Label>
            <Input id="subject" placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl border-border" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="body" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</Label>
              {/* AI Writing Tools */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs rounded-lg text-primary hover:text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Assist
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem onClick={() => handleAIAction("improve_tone")} disabled={aiLoading} className="gap-2 rounded-lg">
                    <Wand2 className="h-4 w-4" />
                    Improve tone
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAIAction("fix_grammar")} disabled={aiLoading} className="gap-2 rounded-lg">
                    <CheckCheck className="h-4 w-4" />
                    Fix grammar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAIAction("make_shorter")} disabled={aiLoading} className="gap-2 rounded-lg">
                    <ArrowDownToLine className="h-4 w-4" />
                    Make shorter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAIAction("make_longer")} disabled={aiLoading} className="gap-2 rounded-lg">
                    <ArrowUpToLine className="h-4 w-4" />
                    Make longer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="relative">
              <Textarea
                id="body"
                placeholder="Type your message here..."
                className="min-h-[200px] resize-none rounded-xl border-border"
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
              />
              {/* Autocomplete suggestion */}
              {autocompleteText && (
                <div
                  className="absolute bottom-2 left-2 right-2 bg-accent/80 backdrop-blur-sm border border-border rounded-xl p-3 cursor-pointer hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2 duration-200"
                  onClick={acceptAutocomplete}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-semibold mb-0.5">Tap to accept suggestion</p>
                      <p className="text-sm text-foreground line-clamp-2">{autocompleteText}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule indicator */}
          {scheduledAt && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-xl text-sm">
              <Clock className="h-4 w-4 text-accent-foreground" />
              <span className="font-medium text-accent-foreground">
                Scheduled: {new Date(scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <button onClick={() => { setScheduledAt(""); setShowSchedule(false); }} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Attachments Display */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attachments ({attachments.length})</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-xl text-sm">
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[200px] truncate font-medium">{attachment.name}</span>
                    <span className="text-muted-foreground text-xs">({(attachment.size / 1024).toFixed(1)}KB)</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveAttachment(attachment)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/30 flex-shrink-0">
          <div className="flex gap-1">
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Popover open={showSchedule} onOpenChange={setShowSchedule}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={`rounded-xl ${scheduledAt ? 'text-primary' : ''}`}>
                  <Clock className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 rounded-xl" align="start">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Schedule Send</p>
                <div className="space-y-1.5 mb-3">
                  {getSchedulePresets().map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => { setScheduledAt(preset.time.toISOString()); setShowSchedule(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium transition-colors"
                    >
                      <span>{preset.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {preset.time.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ""}
                    onChange={(e) => { if (e.target.value) { setScheduledAt(new Date(e.target.value).toISOString()); setShowSchedule(false); }}}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-1.5 rounded-lg text-sm"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="rounded-xl shadow-sm font-semibold" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : scheduledAt ? "Schedule" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
