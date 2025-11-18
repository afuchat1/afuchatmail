import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Save } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface UserSettings {
  id?: string;
  email_signature: string;
  default_reply_to: string;
  notifications_enabled: boolean;
  notification_new_email: boolean;
  notification_replies: boolean;
}

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    email_signature: "",
    default_reply_to: "",
    notifications_enabled: true,
    notification_new_email: true,
    notification_replies: true,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchSettings(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      toast({
        variant: "destructive",
        title: "Error fetching settings",
        description: error.message,
      });
    } else if (data) {
      setSettings(data);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          email_signature: settings.email_signature,
          default_reply_to: settings.default_reply_to,
          notifications_enabled: settings.notifications_enabled,
          notification_new_email: settings.notification_new_email,
          notification_replies: settings.notification_replies,
        });

      if (error) throw error;

      toast({
        title: "Settings saved!",
        description: "Your preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Mail className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card className="border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-blue-900">Email Settings</CardTitle>
              <CardDescription>
                Configure your email signature and default reply-to address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                  id="signature"
                  placeholder="Best regards,&#10;Your Name&#10;Your Title"
                  value={settings.email_signature}
                  onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  This signature will be automatically added to your outgoing emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyTo">Default Reply-To Address</Label>
                <Input
                  id="replyTo"
                  type="email"
                  placeholder="reply@example.com"
                  value={settings.default_reply_to}
                  onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  When recipients reply to your emails, they'll reply to this address
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-blue-900">Notification Preferences</CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for email events
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifications_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newEmail">New Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive new emails
                  </p>
                </div>
                <Switch
                  id="newEmail"
                  checked={settings.notification_new_email}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notification_new_email: checked })
                  }
                  disabled={!settings.notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="replies">Reply Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone replies to your emails
                  </p>
                </div>
                <Switch
                  id="replies"
                  checked={settings.notification_replies}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notification_replies: checked })
                  }
                  disabled={!settings.notifications_enabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Sending Emails</CardTitle>
              <CardDescription>
                Your AfuChat email can send to any email provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You can send emails to any recipient, including:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Gmail addresses (@gmail.com)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  Yahoo Mail addresses (@yahoo.com)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                  Outlook addresses (@outlook.com, @hotmail.com)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Any other email provider
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
