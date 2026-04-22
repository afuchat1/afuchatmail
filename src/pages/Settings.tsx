import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Save, Plus, Trash2, Copy, LogOut, MessageCircle, Link2, Unlink, CreditCard, Crown, ExternalLink, AlertTriangle, Camera, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { avatarColor, initials } from "@/lib/avatar";
// Templates removed from settings
import { EmailAddressSwitcher } from "@/components/EmailAddressSwitcher";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { usePlan, PLAN_LIMITS } from "@/hooks/usePlan";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserSettings {
  id?: string;
  email_signature: string;
  default_reply_to: string;
  notifications_enabled: boolean;
  notification_new_email: boolean;
  notification_replies: boolean;
  email_address_id?: string;
}

interface EmailAddress {
  id: string;
  local_part: string;
  full_email: string;
  is_primary: boolean;
  is_alias: boolean;
  alias_for_id: string | null;
  created_at: string;
}

const Settings = ({ embedded = false }: { embedded?: boolean }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmailAddressId, setSelectedEmailAddressId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    email_signature: "", default_reply_to: "", notifications_enabled: true, notification_new_email: true, notification_replies: true,
  });
  const [emails, setEmails] = useState<EmailAddress[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [creatingEmail, setCreatingEmail] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [selectedAliasTarget, setSelectedAliasTarget] = useState<string>("");
  const [creatingAlias, setCreatingAlias] = useState(false);
  const [telegramCode, setTelegramCode] = useState("");
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  // Profile (full name + avatar)
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plan, refresh: refreshPlan } = usePlan(user);
  const planLimits = PLAN_LIMITS[plan.tier];
  const primaryCount = emails.filter(e => !e.is_alias).length;
  const aliasCount = emails.filter(e => e.is_alias).length;
  const isAdmin = plan.isAdmin;
  const canCreateAliases = isAdmin || plan.tier === "professional" || plan.tier === "business";
  const aliasLimit = planLimits.aliases;
  const atAliasLimit = aliasCount >= aliasLimit;
  const primaryAddress = emails.find(e => e.is_primary);
  // Non-admins cannot create new primary mailboxes.
  const atAddressLimit = !isAdmin || primaryCount >= planLimits.primaryAddresses;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); }
      else {
        setUser(session.user);
        fetchEmails(session.user.id);
        fetchTelegramStatus(session.user.id);
        fetchProfile(session.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { navigate("/auth"); } else { setUser(session.user); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (selectedEmailAddressId) fetchSettings(selectedEmailAddressId);
  }, [selectedEmailAddressId]);

  const fetchSettings = async (emailAddressId: string) => {
    const { data, error } = await supabase.from("user_settings").select("*").eq("email_address_id", emailAddressId).maybeSingle();
    if (error) { toast({ variant: "destructive", title: "Error fetching settings", description: error.message }); }
    else if (data) { setSettings(data); }
    else { setSettings({ email_signature: "", default_reply_to: "", notifications_enabled: true, notification_new_email: true, notification_replies: true, email_address_id: emailAddressId }); }
  };

  const fetchEmails = async (userId: string) => {
    const { data, error } = await supabase.from("email_addresses").select("*").eq("user_id", userId).order("is_primary", { ascending: false }).order("created_at", { ascending: false });
    if (error) { toast({ variant: "destructive", title: "Error fetching emails", description: error.message }); }
    else { setEmails(data || []); }
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreatingEmail(true);
    try {
      const { error } = await supabase.from("email_addresses").insert({ user_id: user.id, local_part: newEmail.toLowerCase() });
      if (error) throw error;
      toast({ title: "Email created!", description: `${newEmail}@afuchat.com is now active.` });
      setNewEmail("");
      fetchEmails(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error creating email", description: error.message });
    } finally { setCreatingEmail(false); }
  };

  const handleSetPrimary = async (emailId: string) => {
    if (!user) return;
    try {
      await supabase.from("email_addresses").update({ is_primary: false }).eq("user_id", user.id);
      const { error } = await supabase.from("email_addresses").update({ is_primary: true }).eq("id", emailId);
      if (error) throw error;
      toast({ title: "Primary email updated!" });
      fetchEmails(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAliasTarget) return;
    setCreatingAlias(true);
    try {
      const { error } = await supabase.from("email_addresses").insert({ user_id: user.id, local_part: newAlias.toLowerCase(), is_alias: true, alias_for_id: selectedAliasTarget });
      if (error) throw error;
      toast({ title: "Alias created!", description: `${newAlias}@afuchat.com will forward to your main address.` });
      setNewAlias("");
      setSelectedAliasTarget("");
      fetchEmails(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error creating alias", description: error.message });
    } finally { setCreatingAlias(false); }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!user) return;
    const emailToDelete = emails.find(e => e.id === id);
    if (!emailToDelete) return;
    const { error } = await supabase.from("email_addresses").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Error deleting email", description: error.message }); }
    else { toast({ title: "Email deleted!", description: `${emailToDelete.full_email} has been removed.` }); fetchEmails(user.id); }
  };

  const handleSave = async () => {
    if (!user || !selectedEmailAddressId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id, email_address_id: selectedEmailAddressId,
        email_signature: settings.email_signature, default_reply_to: settings.default_reply_to,
        notifications_enabled: settings.notifications_enabled, notification_new_email: settings.notification_new_email,
        notification_replies: settings.notification_replies,
      });
      if (error) throw error;
      toast({ title: "Settings saved!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error saving settings", description: error.message });
    } finally { setLoading(false); }
  };

  const fetchTelegramStatus = async (userId: string) => {
    const { data } = await supabase
      .from("telegram_links" as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setTelegramLinked(true);
      setTelegramUsername((data as any).telegram_username);
    }
  };

  const handleLinkTelegram = async () => {
    if (!user || !telegramCode.trim()) return;
    setLinkingTelegram(true);
    try {
      // Find pending link with this code and claim it
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "claim_link", code: telegramCode.trim(), user_id: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Telegram linked!", description: "You'll now receive notifications via Telegram." });
      setTelegramLinked(true);
      setTelegramCode("");
      fetchTelegramStatus(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Link failed", description: error.message });
    } finally { setLinkingTelegram(false); }
  };

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("telegram_links" as any)
      .delete()
      .eq("user_id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setTelegramLinked(false);
      setTelegramUsername(null);
      toast({ title: "Telegram unlinked" });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: "DELETE" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Account deletion failed");
      await supabase.auth.signOut();
      toast({ title: "Account deleted", description: "Your account and all data have been permanently removed." });
      navigate("/auth");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Couldn't delete account", description: err.message });
      setDeletingAccount(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setProfileName((data as any).full_name ?? "");
      setAvatarUrl((data as any).avatar_url ?? null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profileName.trim() })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Couldn't save", description: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Pick an image file" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Max 4 MB." });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(newUrl);
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      toast({ title: "Profile picture removed" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Couldn't remove", description: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className={embedded ? "h-full" : "min-h-screen bg-background"}>
      {!embedded && (
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
        </header>
      )}

      {embedded && (
        <div className="px-5 pt-5 pb-2">
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-5 pb-24">
        <div className="mb-5 mt-3">
          <EmailAddressSwitcher selectedEmailAddressId={selectedEmailAddressId} onEmailAddressChange={setSelectedEmailAddressId} />
        </div>

        <Tabs defaultValue="preferences" className="space-y-5">
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <TabsList className="bg-muted rounded-xl p-1 h-auto inline-flex w-auto min-w-full">
              <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2 flex-1 whitespace-nowrap">Preferences</TabsTrigger>
              <TabsTrigger value="addresses" className="rounded-lg data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2 flex-1 whitespace-nowrap">Addresses</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-lg data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2 flex-1 whitespace-nowrap">Billing</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preferences" className="space-y-5">
            {/* Profile Card — avatar + name */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Profile</h2>
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profileName || user?.email || "Profile"}
                      className="h-16 w-16 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold text-lg select-none"
                      style={{ backgroundColor: avatarColor(user?.id ?? user?.email ?? "u") }}
                      aria-hidden
                    >
                      {initials(profileName, user?.email)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 disabled:opacity-50"
                    aria-label="Change profile picture"
                  >
                    {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="profileName" className="text-xs font-medium">Display name</Label>
                    <Input
                      id="profileName"
                      type="text"
                      placeholder="Your name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      maxLength={80}
                      className="h-9 rounded text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="h-8 rounded-lg text-xs" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save"}
                    </Button>
                    {avatarUrl && (
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                        Remove picture
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Card */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Account</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Signed in</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10" onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Email Settings Card */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Email Settings</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signature" className="text-sm font-medium">Signature</Label>
                  <Textarea id="signature" placeholder="Best regards,&#10;Your Name" value={settings.email_signature}
                    onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                    className="min-h-[100px] bg-background rounded-xl resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="replyTo" className="text-sm font-medium">Reply-To Address</Label>
                  <Input id="replyTo" type="email" placeholder="reply@example.com" value={settings.default_reply_to}
                    onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })}
                    className="border bg-background rounded-xl" />
                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Notifications</h2>
              <div className="space-y-4">
                {[
                  { label: "Notifications", desc: "Receive email event notifications", key: "notifications_enabled" as const, disabled: false },
                  { label: "New emails", desc: "When you receive new emails", key: "notification_new_email" as const, disabled: !settings.notifications_enabled },
                  { label: "Replies", desc: "When someone replies to your emails", key: "notification_replies" as const, disabled: !settings.notifications_enabled },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={settings[item.key]} onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked })} disabled={item.disabled} />
                  </div>
                ))}
                {selectedEmailAddressId && (
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Push Notifications</p>
                    <PushNotificationToggle emailAddressId={selectedEmailAddressId} />
                  </div>
                )}
              </div>
            </div>

            {/* Telegram Integration Card */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                <MessageCircle className="h-3.5 w-3.5 inline mr-1.5" />
                Telegram Bot
              </h2>
              {telegramLinked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-xl">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Link2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <p className="text-xs text-muted-foreground">
                        {telegramUsername ? `@${telegramUsername}` : "Telegram account linked"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You receive email notifications and can manage your inbox via Telegram.
                  </p>
                  <Button variant="outline" size="sm" className="rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10" onClick={handleUnlinkTelegram}>
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    Unlink Telegram
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Link your Telegram to receive notifications and manage emails via bot.
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open <a href="https://t.me/AfuChatMailBot" target="_blank" rel="noopener" className="text-primary font-medium hover:underline">@AfuChatMailBot</a> on Telegram</li>
                    <li>Send <code className="bg-muted px-1 py-0.5 rounded">/start</code> to get a link code</li>
                    <li>Paste the code below</li>
                  </ol>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter link code"
                      value={telegramCode}
                      onChange={(e) => setTelegramCode(e.target.value)}
                      className="border bg-background rounded-xl"
                    />
                    <Button onClick={handleLinkTelegram} disabled={linkingTelegram || !telegramCode.trim()} className="rounded-xl">
                      <Link2 className="h-4 w-4 mr-1.5" />
                      {linkingTelegram ? "Linking..." : "Link"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Card */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Keyboard Shortcuts</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  { keys: ["C"], label: "Compose new email" },
                  { keys: ["R"], label: "Reply to email" },
                  { keys: ["Esc"], label: "Close / go back" },
                  { keys: ["/"], label: "Open search" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 py-0.5">
                    <div className="flex gap-1">
                      {item.keys.map(k => (
                        <kbd key={k} className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-muted border border-border rounded text-foreground">{k}</kbd>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={loading || !selectedEmailAddressId} className="w-full h-12 rounded-xl font-semibold">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Settings"}
            </Button>

            {/* Danger Zone */}
            <div className="bg-card rounded p-4 border border-destructive/20">
              <h2 className="text-xs font-bold text-destructive uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Danger Zone
              </h2>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Delete account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently remove your account, mailbox, all emails, drafts, settings, and subscriptions. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                  onClick={() => { setDeleteConfirmText(""); setDeleteOpen(true); }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </TabsContent>

          <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deletingAccount) setDeleteOpen(o); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    This will <strong>permanently delete</strong> your AfuChat Mail account
                    {user?.email ? <> (<span className="font-mono">{user.email}</span>)</> : null}, your mailbox address, all received and sent emails, drafts, OAuth apps, subscriptions, and settings.
                  </span>
                  <span className="block text-destructive font-medium">This action cannot be undone.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="confirmDelete" className="text-xs font-medium">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm
                </Label>
                <Input
                  id="confirmDelete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="rounded-xl"
                  autoFocus
                  disabled={deletingAccount}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingAccount} className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                  disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingAccount ? "Deleting…" : "Delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <TabsContent value="addresses" className="space-y-5">
            {/* Plan / role notice */}
            <div className="bg-card rounded p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {isAdmin ? "Administrator" : "Your plan"}
                </p>
                <p className="text-sm font-semibold mt-0.5">{isAdmin ? "Admin · unlimited" : planLimits.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAdmin
                    ? `${primaryCount} primary · ${aliasCount} alias${aliasCount === 1 ? "" : "es"}`
                    : canCreateAliases
                      ? `${primaryAddress?.full_email ?? "—"} · ${aliasCount}/${aliasLimit} aliases used`
                      : `Your address: ${primaryAddress?.full_email ?? "—"}`}
                </p>
              </div>
              {!isAdmin && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate("/pricing")}>
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  Upgrade
                </Button>
              )}
            </div>

            {/* Create New Card — admins only (mints brand-new mailboxes) */}
            {isAdmin && (
              <div className="bg-card rounded p-4">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">New address or alias</h2>
                <form onSubmit={handleCreateEmail} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input placeholder="yourname" value={newEmail} onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                        pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]" minLength={3} maxLength={30} required
                        className="pr-28 bg-background rounded-xl" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">@afuchat.com</span>
                    </div>
                    <Button type="submit" disabled={creatingEmail} size="icon" className="rounded-xl h-10 w-10">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">3-30 characters, lowercase letters, numbers, dots, hyphens.</p>
                </form>
              </div>
            )}

            {/* Alias creation — paid (Professional / Business) users */}
            {!isAdmin && canCreateAliases && primaryAddress && (
              <div className="bg-card rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add an alias</h2>
                  <span className="text-[11px] text-muted-foreground font-medium">{aliasCount}/{aliasLimit} used</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!primaryAddress) return;
                    setSelectedAliasTarget(primaryAddress.id);
                    handleCreateAlias(e);
                  }}
                  className="space-y-3"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="alias-name"
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value.toLowerCase())}
                        pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                        minLength={3}
                        maxLength={30}
                        required
                        disabled={atAliasLimit}
                        className="pr-28 bg-background rounded-xl"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">@afuchat.com</span>
                    </div>
                    <Button type="submit" disabled={creatingAlias || atAliasLimit} size="icon" className="rounded-xl h-10 w-10">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {atAliasLimit
                      ? "You've reached your alias limit. Upgrade for more."
                      : `Aliases forward to ${primaryAddress.full_email}. 3-30 chars, lowercase letters, numbers, dots, hyphens.`}
                  </p>
                </form>
              </div>
            )}

            {/* Existing Addresses Card */}
            <div className="bg-card rounded p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Your Addresses ({emails.length})
              </h2>
              {emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-5 w-5 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No email addresses yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {emails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between py-3 px-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                          <Mail className="h-3.5 w-3.5 text-accent-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{email.full_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.is_primary ? "Primary" : email.is_alias ? "Alias" : "Address"} · {new Date(email.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { navigator.clipboard.writeText(email.full_email); toast({ title: "Copied!" }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {((isAdmin && !email.is_primary) || (!isAdmin && email.is_alias)) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteEmail(email.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-5">
            <BillingPanel
              plan={plan}
              planLimits={planLimits}
              userId={user?.id}
              onRefresh={refreshPlan}
              onUpgrade={() => navigate("/pricing")}
            />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Settings;

// ────────────────────────────────────────────────────────────────────────────
// Billing Panel
// ────────────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan_id: string | null;
  skypay_reference_id: string | null;
  created_at: string;
}

function BillingPanel({
  plan,
  planLimits,
  userId,
  onRefresh,
  onUpgrade,
}: {
  plan: ReturnType<typeof usePlan>["plan"];
  planLimits: typeof PLAN_LIMITS[keyof typeof PLAN_LIMITS];
  userId: string | undefined;
  onRefresh: () => void;
  onUpgrade: () => void;
}) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [checkingPending, setCheckingPending] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayments = async () => {
    if (!userId) return;
    setLoadingPayments(true);
    const { data } = await supabase
      .from("payment_transactions")
      .select("id,amount,currency,status,plan_id,skypay_reference_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setPayments((data as PaymentRow[]) || []);
    setLoadingPayments(false);
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const checkPending = async (row: PaymentRow) => {
    if (!row.skypay_reference_id || !row.plan_id) {
      toast({ title: "No SkyPay reference yet", description: "This payment hasn't been registered with SkyPay yet. Try again in a few seconds." });
      return;
    }
    setCheckingPending(row.id);
    const { data, error } = await supabase.functions.invoke("skypay-confirm-payment", {
      body: { reference: row.skypay_reference_id, planId: row.plan_id },
    });
    setCheckingPending(null);
    if (!error && data?.success) {
      toast({ title: "Payment confirmed", description: "Your plan is now active." });
      onRefresh();
      fetchPayments();
    } else {
      toast({
        title: "Still pending",
        description: data?.error || "SkyPay hasn't confirmed this payment yet.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Active plan card */}
      <div className="bg-card rounded p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current plan</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-bold">{planLimits.name}</p>
              {plan.status === "active" && (
                <Badge variant="secondary" className="text-[10px]">Active</Badge>
              )}
              {plan.isAdmin && (
                <Badge className="text-[10px]">Admin</Badge>
              )}
            </div>
            {plan.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Renews on {new Date(plan.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {plan.tier !== "business" && plan.tier !== "admin" && (
            <Button size="sm" className="rounded-xl" onClick={onUpgrade}>
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Upgrade
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-4">
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Addresses</p>
            <p className="text-sm font-bold mt-0.5">
              {planLimits.primaryAddresses === Infinity ? "∞" : planLimits.primaryAddresses}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Custom domain</p>
            <p className="text-sm font-bold mt-0.5">{planLimits.customDomain ? "Yes" : "—"}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">OAuth API</p>
            <p className="text-sm font-bold mt-0.5">{planLimits.oauthApi ? "Yes" : "—"}</p>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-card rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment history</h2>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={fetchPayments}>
            Refresh
          </Button>
        </div>
        {loadingPayments ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((row) => (
              <div key={row.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {row.plan_id ? row.plan_id.charAt(0).toUpperCase() + row.plan_id.slice(1) : "Payment"} ·{" "}
                    {row.currency} {row.amount.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                    {row.skypay_reference_id && <> · <span className="font-mono">{row.skypay_reference_id.slice(0, 12)}…</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={row.status === "completed" ? "default" : row.status === "failed" ? "destructive" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {row.status}
                  </Badge>
                  {row.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={checkingPending === row.id}
                      onClick={() => checkPending(row)}
                    >
                      {checkingPending === row.id ? "Checking…" : "Check"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full mt-4 rounded-xl" onClick={onUpgrade}>
          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
          View pricing plans
          <ExternalLink className="h-3 w-3 ml-1.5" />
        </Button>
      </div>
    </>
  );
}
