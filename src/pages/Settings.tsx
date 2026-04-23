import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, ArrowLeft, Save, Plus, Trash2, Copy, LogOut, MessageCircle,
  Link2, Unlink, CreditCard, Crown, ExternalLink, AlertTriangle, Camera,
  Loader2, User as UserIcon, Bell, Keyboard, AtSign, ShieldAlert,
  Settings as SettingsIcon, Check, ChevronRight, Sparkles,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { avatarColor, initials } from "@/lib/avatar";
import { EmailAddressSwitcher } from "@/components/EmailAddressSwitcher";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { usePlan, PLAN_LIMITS } from "@/hooks/usePlan";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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

type SectionId =
  | "profile"
  | "email"
  | "notifications"
  | "integrations"
  | "addresses"
  | "billing"
  | "shortcuts"
  | "danger";

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }>; group: "Account" | "Mail" | "Workspace" }[] = [
  { id: "profile",       label: "Profile",        icon: UserIcon,    group: "Account" },
  { id: "email",         label: "Email",          icon: Mail,        group: "Mail" },
  { id: "notifications", label: "Notifications",  icon: Bell,        group: "Mail" },
  { id: "addresses",     label: "Addresses",      icon: AtSign,      group: "Mail" },
  { id: "integrations",  label: "Integrations",   icon: Link2,       group: "Workspace" },
  { id: "billing",       label: "Billing & plan", icon: CreditCard,  group: "Workspace" },
  { id: "shortcuts",     label: "Shortcuts",      icon: Keyboard,    group: "Workspace" },
  { id: "danger",        label: "Danger zone",    icon: ShieldAlert, group: "Account" },
];

const Settings = ({ embedded = false }: { embedded?: boolean }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [selectedEmailAddressId, setSelectedEmailAddressId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    email_signature: "", default_reply_to: "", notifications_enabled: true, notification_new_email: true, notification_replies: true,
  });
  const [emails, setEmails] = useState<EmailAddress[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [creatingEmail, setCreatingEmail] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [, setSelectedAliasTarget] = useState<string>("");
  const [creatingAlias, setCreatingAlias] = useState(false);
  const [telegramCode, setTelegramCode] = useState("");
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
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
      toast({ title: "Email created", description: `${newEmail}@afuchat.com is now active.` });
      setNewEmail("");
      fetchEmails(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error creating email", description: error.message });
    } finally { setCreatingEmail(false); }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !primaryAddress) return;
    setCreatingAlias(true);
    try {
      const { error } = await supabase.from("email_addresses").insert({ user_id: user.id, local_part: newAlias.toLowerCase(), is_alias: true, alias_for_id: primaryAddress.id });
      if (error) throw error;
      toast({ title: "Alias created", description: `${newAlias}@afuchat.com forwards to your main address.` });
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
    else { toast({ title: "Email deleted", description: `${emailToDelete.full_email} has been removed.` }); fetchEmails(user.id); }
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
      toast({ title: "Settings saved" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error saving settings", description: error.message });
    } finally { setLoading(false); }
  };

  const fetchTelegramStatus = async (userId: string) => {
    const { data } = await supabase.from("telegram_links" as any).select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      setTelegramLinked(true);
      setTelegramUsername((data as any).telegram_username);
    }
  };

  const handleLinkTelegram = async () => {
    if (!user || !telegramCode.trim()) return;
    setLinkingTelegram(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "claim_link", code: telegramCode.trim(), user_id: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Telegram linked", description: "You'll now receive notifications via Telegram." });
      setTelegramLinked(true);
      setTelegramCode("");
      fetchTelegramStatus(user.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Link failed", description: error.message });
    } finally { setLinkingTelegram(false); }
  };

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    const { error } = await supabase.from("telegram_links" as any).delete().eq("user_id", user.id);
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
      const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
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
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle();
    if (data) {
      setProfileName((data as any).full_name ?? "");
      setAvatarUrl((data as any).avatar_url ?? null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: profileName.trim() }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Couldn't save", description: err.message });
    } finally { setSavingProfile(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast({ variant: "destructive", title: "Pick an image file" }); return; }
    if (file.size > 4 * 1024 * 1024) { toast({ variant: "destructive", title: "Image too large", description: "Max 4 MB." }); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(newUrl);
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally { setUploadingAvatar(false); }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      toast({ title: "Profile picture removed" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Couldn't remove", description: err.message });
    } finally { setUploadingAvatar(false); }
  };

  const groupedSections = useMemo(() => {
    const groups: Record<string, typeof SECTIONS> = {};
    SECTIONS.forEach(s => { (groups[s.group] ||= []).push(s); });
    return groups;
  }, []);

  const activeMeta = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className={embedded ? "h-full bg-background" : "min-h-screen bg-background"}>
      {!embedded && (
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold tracking-tight">Settings</h1>
            </div>
          </div>
        </header>
      )}

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10 lg:grid lg:grid-cols-[260px,1fr] lg:gap-12">
        {/* ─── Sidebar nav ─────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {embedded && (
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>
          )}

          {/* Mobile section picker — 2 col grid, no scroll */}
          <div className="lg:hidden mb-5">
            <div className="grid grid-cols-2 gap-1.5">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                const isDanger = s.id === "danger";
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSection(s.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left",
                      active
                        ? isDanger
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : "bg-accent border-border text-foreground shadow-sm"
                        : "bg-card border-border/50 text-muted-foreground active:scale-[0.98]"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && !isDanger && "text-primary")} />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop sidebar */}
          <nav className="hidden lg:block space-y-6">
            {Object.entries(groupedSections).map(([group, items]) => (
              <div key={group}>
                <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-2">{group}</p>
                <div className="space-y-0.5">
                  {items.map(s => {
                    const Icon = s.icon;
                    const active = activeSection === s.id;
                    const isDanger = s.id === "danger";
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all group relative",
                          active
                            ? isDanger
                              ? "bg-destructive/10 text-destructive"
                              : "bg-accent text-accent-foreground"
                            : isDanger
                              ? "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        {active && !isDanger && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
                        )}
                        <Icon className={cn(
                          "h-4 w-4 transition-colors shrink-0",
                          active
                            ? isDanger ? "text-destructive" : "text-foreground"
                            : "text-muted-foreground/70 group-hover:text-foreground"
                        )} />
                        <span className="flex-1 text-left truncate">{s.label}</span>
                        {active && !isDanger && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* ─── Content ─────────────────────────────────────────────── */}
        <main className="min-w-0 pb-[max(env(safe-area-inset-bottom),6rem)]">
          {/* Section header */}
          <div className="mb-5 sm:mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{activeMeta.label}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{sectionDescription(activeSection)}</p>
            </div>
            {(activeSection === "email" || activeSection === "notifications") && selectedEmailAddressId && (
              <Button onClick={handleSave} disabled={loading} size="sm" className="rounded-lg shrink-0 h-9">
                {loading ? <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 sm:mr-1.5" />}
                <span className="hidden sm:inline">Save</span>
              </Button>
            )}
          </div>

          {/* Mailbox switcher (relevant sections) */}
          {(activeSection === "email" || activeSection === "notifications") && (
            <div className="mb-6">
              <EmailAddressSwitcher selectedEmailAddressId={selectedEmailAddressId} onEmailAddressChange={setSelectedEmailAddressId} />
            </div>
          )}

          {/* ─── Profile ─────────────────────────────────────────── */}
          {activeSection === "profile" && (
            <div className="space-y-6">
              <Section title="Identity" desc="How you appear across AfuChat Mail.">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profileName || user?.email || "Profile"} className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
                    ) : (
                      <div className="h-20 w-20 rounded-full flex items-center justify-center text-white font-semibold text-xl select-none ring-2 ring-border"
                        style={{ backgroundColor: avatarColor(user?.id ?? user?.email ?? "u") }}>
                        {initials(profileName, user?.email)}
                      </div>
                    )}
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-105 transition-transform disabled:opacity-50"
                      aria-label="Change profile picture">
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <Field label="Display name" htmlFor="profileName">
                      <Input id="profileName" type="text" placeholder="Your name" value={profileName}
                        onChange={(e) => setProfileName(e.target.value)} maxLength={80} className="h-9 rounded-lg" />
                    </Field>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" className="h-8 rounded-lg" onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile ? "Saving…" : "Save changes"}
                      </Button>
                      {avatarUrl && (
                        <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                          Remove picture
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Account" desc="Authentication and session details.">
                <Row
                  label="Email"
                  value={<span className="font-mono text-xs">{user?.email}</span>}
                />
                <Divider />
                <Row
                  label="Session"
                  value={<Badge variant="secondary" className="text-[10px] gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</Badge>}
                  action={
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                      onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      Sign out
                    </Button>
                  }
                />
              </Section>
            </div>
          )}

          {/* ─── Email ───────────────────────────────────────────── */}
          {activeSection === "email" && (
            <div className="space-y-6">
              <Section title="Composing" desc="Personalize how your outgoing messages look.">
                <Field label="Email signature" htmlFor="signature" hint="Appears at the bottom of every email you send from this address.">
                  <Textarea id="signature" placeholder="Best regards,&#10;Your Name" value={settings.email_signature}
                    onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                    className="min-h-[120px] rounded-lg resize-none font-mono text-sm" />
                </Field>
                <Divider />
                <Field label="Default reply-to" htmlFor="replyTo" hint="Replies sent from this mailbox will use this address by default.">
                  <Input id="replyTo" type="email" placeholder="reply@example.com" value={settings.default_reply_to}
                    onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })} className="h-9 rounded-lg" />
                </Field>
              </Section>
            </div>
          )}

          {/* ─── Notifications ───────────────────────────────────── */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <Section title="In-app notifications" desc="Control which email events surface inside AfuChat Mail.">
                {[
                  { label: "All notifications", desc: "Master switch for email event alerts.", key: "notifications_enabled" as const, disabled: false },
                  { label: "New emails", desc: "When you receive new messages.", key: "notification_new_email" as const, disabled: !settings.notifications_enabled },
                  { label: "Replies", desc: "When someone replies to your emails.", key: "notification_replies" as const, disabled: !settings.notifications_enabled },
                ].map((item, i, arr) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <Switch checked={settings[item.key]} onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked })} disabled={item.disabled} />
                    </div>
                    {i < arr.length - 1 && <Divider />}
                  </div>
                ))}
              </Section>

              {selectedEmailAddressId && (
                <Section title="Push notifications" desc="Receive push alerts on this device when new mail arrives.">
                  <PushNotificationToggle emailAddressId={selectedEmailAddressId} />
                </Section>
              )}
            </div>
          )}

          {/* ─── Integrations ────────────────────────────────────── */}
          {activeSection === "integrations" && (
            <div className="space-y-6">
              <Section
                title="Telegram"
                desc="Receive notifications and manage your inbox from Telegram."
                titleIcon={<MessageCircle className="h-4 w-4 text-muted-foreground" />}
              >
                {telegramLinked ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Connected</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {telegramUsername ? `@${telegramUsername}` : "Telegram account linked"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" onClick={handleUnlinkTelegram}>
                        <Unlink className="h-3.5 w-3.5 mr-1.5" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Open <a href="https://t.me/AfuChatMailBot" target="_blank" rel="noopener" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">@AfuChatMailBot<ExternalLink className="h-3 w-3" /></a> on Telegram</li>
                      <li>Send <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/start</code> to receive a link code</li>
                      <li>Paste the code below and tap Link</li>
                    </ol>
                    <div className="flex gap-2">
                      <Input placeholder="Enter link code" value={telegramCode} onChange={(e) => setTelegramCode(e.target.value)} className="h-9 rounded-lg font-mono" />
                      <Button onClick={handleLinkTelegram} disabled={linkingTelegram || !telegramCode.trim()} className="h-9 rounded-lg">
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        {linkingTelegram ? "Linking…" : "Link"}
                      </Button>
                    </div>
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ─── Addresses ───────────────────────────────────────── */}
          {activeSection === "addresses" && (
            <div className="space-y-6">
              {/* Plan banner */}
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? <Crown className="h-4 w-4 text-amber-500" /> : <Sparkles className="h-4 w-4 text-primary" />}
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {isAdmin ? "Administrator" : "Your plan"}
                    </p>
                  </div>
                  <p className="text-base font-semibold mt-1">{isAdmin ? "Admin · unlimited" : planLimits.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAdmin
                      ? `${primaryCount} primary · ${aliasCount} alias${aliasCount === 1 ? "" : "es"}`
                      : canCreateAliases
                        ? `${primaryAddress?.full_email ?? "—"} · ${aliasCount}/${aliasLimit} aliases used`
                        : `Your address: ${primaryAddress?.full_email ?? "—"}`}
                  </p>
                </div>
                {!isAdmin && (
                  <Button size="sm" className="rounded-lg shrink-0" onClick={() => navigate("/pricing")}>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Upgrade
                  </Button>
                )}
              </div>

              {isAdmin && (
                <Section title="Create new address" desc="Mint a brand-new mailbox on @afuchat.com.">
                  <form onSubmit={handleCreateEmail} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input placeholder="yourname" value={newEmail} onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                          pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]" minLength={3} maxLength={30} required className="h-9 pr-28 rounded-lg font-mono" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">@afuchat.com</span>
                      </div>
                      <Button type="submit" disabled={creatingEmail} className="h-9 rounded-lg">
                        <Plus className="h-4 w-4 mr-1" />
                        Create
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">3–30 characters, lowercase letters, numbers, dots and hyphens.</p>
                  </form>
                </Section>
              )}

              {!isAdmin && canCreateAliases && primaryAddress && (
                <Section
                  title="Add an alias"
                  desc={`Aliases forward to ${primaryAddress.full_email}.`}
                  trailing={<span className="text-[11px] text-muted-foreground font-medium">{aliasCount}/{aliasLimit} used</span>}
                >
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (!primaryAddress) return; setSelectedAliasTarget(primaryAddress.id); handleCreateAlias(e); }}
                    className="space-y-3"
                  >
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input placeholder="alias-name" value={newAlias} onChange={(e) => setNewAlias(e.target.value.toLowerCase())}
                          pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]" minLength={3} maxLength={30} required disabled={atAliasLimit}
                          className="h-9 pr-28 rounded-lg font-mono" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">@afuchat.com</span>
                      </div>
                      <Button type="submit" disabled={creatingAlias || atAliasLimit} className="h-9 rounded-lg">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {atAliasLimit ? "You've reached your alias limit. Upgrade for more." : "3–30 chars, lowercase letters, numbers, dots and hyphens."}
                    </p>
                  </form>
                </Section>
              )}

              <Section title={`Your addresses`} desc={`${emails.length} address${emails.length === 1 ? "" : "es"} on this account.`}>
                {emails.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Mail className="h-5 w-5 opacity-40" />
                    </div>
                    <p className="text-sm font-medium">No email addresses yet</p>
                  </div>
                ) : (
                  <div className="-mx-4">
                    {emails.map((email, i) => (
                      <div key={email.id} className={cn("flex items-center justify-between gap-3 px-4 py-3", i !== emails.length - 1 && "border-b border-border/50")}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                            email.is_primary ? "bg-primary/10 text-primary" : email.is_alias ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
                          )}>
                            {email.is_primary ? <Crown className="h-4 w-4" /> : email.is_alias ? <AtSign className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate font-mono">{email.full_email}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {email.is_primary ? "Primary" : email.is_alias ? "Alias" : "Address"}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                Added {new Date(email.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { navigator.clipboard.writeText(email.full_email); toast({ title: "Copied" }); }}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {((isAdmin && !email.is_primary) || (!isAdmin && email.is_alias)) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEmail(email.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ─── Billing ─────────────────────────────────────────── */}
          {activeSection === "billing" && (
            <div className="space-y-6">
              <BillingPanel
                plan={plan}
                planLimits={planLimits}
                userId={user?.id}
                onRefresh={refreshPlan}
                onUpgrade={() => navigate("/pricing")}
              />
            </div>
          )}

          {/* ─── Shortcuts ───────────────────────────────────────── */}
          {activeSection === "shortcuts" && (
            <Section title="Keyboard shortcuts" desc="Move faster with these keys from anywhere in the app.">
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { keys: ["C"], label: "Compose new email" },
                  { keys: ["R"], label: "Reply to email" },
                  { keys: ["Esc"], label: "Close / go back" },
                  { keys: ["/"], label: "Open search" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <div className="flex gap-1">
                      {item.keys.map(k => (
                        <kbd key={k} className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-muted border border-border rounded-md text-foreground shadow-sm">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ─── Danger ──────────────────────────────────────────── */}
          {activeSection === "danger" && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently remove your account, mailbox, all emails, drafts, settings and subscriptions. This action cannot be undone.
              </p>
              <Button variant="outline" size="sm" className="rounded-lg text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { setDeleteConfirmText(""); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete my account
              </Button>
            </div>
          )}
        </main>
      </div>

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
            <Input id="confirmDelete" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE" className="rounded-lg font-mono" autoFocus disabled={deletingAccount} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount} className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={deleteConfirmText !== "DELETE" || deletingAccount}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingAccount ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;

// ─── Reusable layout primitives ──────────────────────────────────────────────

function Section({
  title, desc, children, titleIcon, trailing,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  titleIcon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <header className="px-4 sm:px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-border/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {titleIcon}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        {trailing}
      </header>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label, htmlFor, hint, children,
}: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label, value, action,
}: { label: string; value?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {value && <div className="text-xs text-muted-foreground mt-0.5">{value}</div>}
      </div>
      {action}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/50 -mx-4 sm:-mx-5" />;
}

function sectionDescription(id: SectionId): string {
  switch (id) {
    case "profile":       return "Your identity and account information.";
    case "email":         return "Composing defaults for the selected mailbox.";
    case "notifications": return "Decide what reaches your inbox and devices.";
    case "addresses":     return "Manage primary mailboxes and forwarding aliases.";
    case "integrations":  return "Connect AfuChat Mail to other services.";
    case "billing":       return "Plan, usage, and payment history.";
    case "shortcuts":     return "Keyboard shortcuts to move faster.";
    case "danger":        return "Irreversible account actions.";
  }
}

// ─── Billing Panel ───────────────────────────────────────────────────────────

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan_id: string | null;
  skypay_reference_id: string | null;
  client_reference: string | null;
  created_at: string;
}

function BillingPanel({
  plan, planLimits, userId, onRefresh, onUpgrade,
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
        .select("id,amount,currency,status,plan_id,skypay_reference_id,client_reference,created_at")
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
    if (!row.plan_id) {
      toast({ title: "Missing plan", description: "This payment row has no plan associated.", variant: "destructive" });
      return;
    }
    setCheckingPending(row.id);

    let liveRow: PaymentRow | null = row;
    const { data: fresh } = await supabase
      .from("payment_transactions")
      .select("id,amount,currency,status,plan_id,skypay_reference_id,client_reference,created_at")
      .eq("id", row.id)
      .maybeSingle();
    if (fresh) liveRow = fresh as PaymentRow;

    const realReference = liveRow?.skypay_reference_id?.startsWith("afuchat-") ? undefined : liveRow?.skypay_reference_id || undefined;
    const { data, error } = await supabase.functions.invoke("skypay-confirm-payment", {
      body: {
        reference: realReference,
        productId: liveRow?.client_reference || (liveRow?.skypay_reference_id?.startsWith("afuchat-") ? liveRow.skypay_reference_id : undefined),
        paymentId: liveRow?.id,
        planId: liveRow?.plan_id || row.plan_id,
      },
    });
    setCheckingPending(null);

    if (!error && data?.success) {
      toast({ title: "Payment confirmed", description: "Your plan is now active." });
      onRefresh();
      fetchPayments();
    } else {
      const desc = data?.error || error?.message || "SkyPay hasn't confirmed this payment yet.";
      toast({ title: "Still pending", description: desc, variant: "destructive" });
      fetchPayments();
    }
  };

  return (
    <>
      {/* Active plan hero card */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2 mt-1.5">
              <h3 className="text-2xl font-semibold tracking-tight">{planLimits.name}</h3>
              {plan.status === "active" && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </Badge>
              )}
              {plan.isAdmin && <Badge className="text-[10px] gap-1"><Crown className="h-3 w-3" />Admin</Badge>}
            </div>
            {plan.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Renews on {new Date(plan.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {plan.tier !== "business" && plan.tier !== "admin" && (
            <Button size="sm" className="rounded-lg shrink-0" onClick={onUpgrade}>
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Upgrade
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <PlanStat label="Addresses" value={planLimits.primaryAddresses === Infinity ? "∞" : String(planLimits.primaryAddresses)} />
          <PlanStat label="Custom domain" value={planLimits.customDomain ? "Included" : "—"} />
          <PlanStat label="OAuth API" value={planLimits.oauthApi ? "Included" : "—"} />
        </div>
      </div>

      {/* Payment history */}
      <Section
        title="Payment history"
        desc="Recent transactions on this account."
        trailing={
          <Button size="sm" variant="ghost" className="h-7 text-xs rounded-md" onClick={fetchPayments}>
            Refresh
          </Button>
        }
      >
        {loadingPayments ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">No payments yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your transactions will appear here.</p>
          </div>
        ) : (
          <div className="-mx-5">
            {payments.map((row, i) => (
              <div key={row.id} className={cn(
                "flex items-center justify-between gap-3 px-5 py-3",
                i !== payments.length - 1 && "border-b border-border/50"
              )}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {row.plan_id ? row.plan_id.charAt(0).toUpperCase() + row.plan_id.slice(1) : "Payment"} ·{" "}
                    <span className="font-mono">{row.currency} {row.amount.toLocaleString()}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
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
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" disabled={checkingPending === row.id} onClick={() => checkPending(row)}>
                      {checkingPending === row.id ? "Checking…" : "Check"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={onUpgrade}>
          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
          View pricing plans
          <ExternalLink className="h-3 w-3 ml-1.5" />
        </Button>
      </Section>
    </>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}
