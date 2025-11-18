import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, LogOut, Plus, Trash2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface EmailAddress {
  id: string;
  local_part: string;
  full_email: string;
  is_primary: boolean;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<EmailAddress[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchEmails(session.user.id);
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

  const fetchEmails = async (userId: string) => {
    const { data, error } = await supabase
      .from("email_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching emails",
        description: error.message,
      });
    } else {
      setEmails(data || []);
    }
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("email_addresses")
        .insert({
          user_id: user.id,
          local_part: newEmail.toLowerCase(),
        });

      if (error) throw error;

      toast({
        title: "Email created!",
        description: `${newEmail}@afuchat.com is now active.`,
      });

      setNewEmail("");
      fetchEmails(user.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating email",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("email_addresses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting email",
        description: error.message,
      });
    } else {
      toast({
        title: "Email deleted",
        description: "Your email address has been removed.",
      });
      fetchEmails(user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8 pt-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AfuChat Mail
            </h1>
            <p className="text-muted-foreground mt-1">Manage your @afuchat.com emails</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Email</CardTitle>
            <CardDescription>
              Choose a unique username for your @afuchat.com email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email Username</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="newEmail"
                      type="text"
                      placeholder="yourname"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                      minLength={3}
                      maxLength={30}
                      required
                      className="pr-32"
                    />
                    <span className="absolute right-3 top-3 text-muted-foreground text-sm">
                      @afuchat.com
                    </span>
                  </div>
                  <Button type="submit" disabled={loading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  3-30 characters, lowercase letters, numbers, dots, hyphens, and underscores
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Email Addresses</CardTitle>
            <CardDescription>
              You have {emails.length} email address{emails.length !== 1 ? "es" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No email addresses yet. Create your first one above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{email.full_email}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(email.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEmail(email.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;