import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Save, Plus, Trash2, Copy, LogOut } from "lucide-react";
import { User } from "@supabase/supabase-js";
// Templates removed from settings
import { EmailAddressSwitcher } from "@/components/EmailAddressSwitcher";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); }
      else { setUser(session.user); fetchEmails(session.user.id); }
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

  return (
    <div className={embedded ? "h-full" : "min-h-screen bg-background"}>
      {!embedded && (
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
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
          <TabsList className="bg-muted rounded-xl p-1 h-auto">
            <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2">Preferences</TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-lg data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2">Addresses</TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-5">
            {/* Account Card */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
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
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Email Settings</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signature" className="text-sm font-medium">Signature</Label>
                  <Textarea id="signature" placeholder="Best regards,&#10;Your Name" value={settings.email_signature}
                    onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                    className="min-h-[100px] border border-border bg-background rounded-xl resize-none shadow-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="replyTo" className="text-sm font-medium">Reply-To Address</Label>
                  <Input id="replyTo" type="email" placeholder="reply@example.com" value={settings.default_reply_to}
                    onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })}
                    className="border border-border bg-background rounded-xl shadow-xs" />
                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
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
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium mb-2">Push Notifications</p>
                    <PushNotificationToggle emailAddressId={selectedEmailAddressId} />
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={loading || !selectedEmailAddressId} className="w-full h-12 rounded-xl font-semibold shadow-md hover:shadow-lg transition-shadow">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </TabsContent>

          <TabsContent value="addresses" className="space-y-5">
            {/* Create New Card */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">New Address</h2>
              <form onSubmit={handleCreateEmail} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input placeholder="yourname" value={newEmail} onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                      pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]" minLength={3} maxLength={30} required
                      className="pr-28 border border-border bg-background rounded-xl shadow-xs" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">@afuchat.com</span>
                  </div>
                  <Button type="submit" disabled={creatingEmail} size="icon" className="rounded-xl shadow-sm h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">3-30 characters, lowercase letters, numbers, dots, hyphens</p>
              </form>
            </div>

            {/* Existing Addresses Card */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Your Addresses ({emails.length})
              </h2>
              {emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteEmail(email.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
