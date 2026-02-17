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
import { Mail, ArrowLeft, Save, Plus, Trash2, Copy } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { EmailTemplates } from "@/components/EmailTemplates";
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
    email_signature: "",
    default_reply_to: "",
    notifications_enabled: true,
    notification_new_email: true,
    notification_replies: true,
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
      if (!session) { navigate("/auth"); }
      else { setUser(session.user); }
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
    <div className="min-h-screen bg-background">
      {!embedded && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </header>
      )}

      <main className="max-w-2xl mx-auto px-5 pb-16">
        <div className="mb-6">
          <EmailAddressSwitcher
            selectedEmailAddressId={selectedEmailAddressId}
            onEmailAddressChange={setSelectedEmailAddressId}
          />
        </div>

        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-8">
            {/* Account */}
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Account</h2>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Signed in</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
                  Sign Out
                </Button>
              </div>
            </section>

            <div className="border-t" />

            {/* Email Settings */}
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Email Settings</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signature" className="text-sm">Signature</Label>
                  <Textarea
                    id="signature"
                    placeholder="Best regards,&#10;Your Name"
                    value={settings.email_signature}
                    onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                    className="min-h-[100px] border-0 bg-muted rounded-lg resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="replyTo" className="text-sm">Reply-To Address</Label>
                  <Input
                    id="replyTo"
                    type="email"
                    placeholder="reply@example.com"
                    value={settings.default_reply_to}
                    onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })}
                    className="border-0 bg-muted rounded-lg"
                  />
                </div>
              </div>
            </section>

            <div className="border-t" />

            {/* Notifications */}
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive email event notifications</p>
                  </div>
                  <Switch checked={settings.notifications_enabled} onCheckedChange={(checked) => setSettings({ ...settings, notifications_enabled: checked })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">New emails</p>
                    <p className="text-xs text-muted-foreground">When you receive new emails</p>
                  </div>
                  <Switch checked={settings.notification_new_email} onCheckedChange={(checked) => setSettings({ ...settings, notification_new_email: checked })} disabled={!settings.notifications_enabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Replies</p>
                    <p className="text-xs text-muted-foreground">When someone replies to your emails</p>
                  </div>
                  <Switch checked={settings.notification_replies} onCheckedChange={(checked) => setSettings({ ...settings, notification_replies: checked })} disabled={!settings.notifications_enabled} />
                </div>
                {selectedEmailAddressId && (
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Push Notifications</p>
                    <PushNotificationToggle emailAddressId={selectedEmailAddressId} />
                  </div>
                )}
              </div>
            </section>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={loading || !selectedEmailAddressId} className="w-full h-12 rounded-lg">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="addresses" className="space-y-8">
            {/* Create New */}
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">New Address</h2>
              <form onSubmit={handleCreateEmail} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="yourname"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                      pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                      minLength={3}
                      maxLength={30}
                      required
                      className="pr-28 border-0 bg-muted rounded-lg"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">@afuchat.com</span>
                  </div>
                  <Button type="submit" disabled={creatingEmail} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">3-30 characters, lowercase letters, numbers, dots, hyphens</p>
              </form>
            </section>

            <div className="border-t" />

            {/* Existing Addresses */}
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Your Addresses ({emails.length})
              </h2>
              {emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No email addresses yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {emails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{email.full_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.is_primary ? "Primary" : email.is_alias ? "Alias" : "Address"} · {new Date(email.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(email.full_email); toast({ title: "Copied!" }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEmail(email.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplates />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
