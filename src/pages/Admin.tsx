import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, Shield, Users, Mail, Crown, ChevronDown, KeyRound } from "lucide-react";

interface UserData {
  user_id: string;
  auth_email: string | null;
  email_count: number;
  is_admin: boolean;
  email_addresses: string[];
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Fetch all users using admin function
      const { data, error } = await supabase.rpc("admin_get_all_users");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to load admin panel");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, makeAdmin: boolean) => {
    setTogglingUser(userId);
    try {
      const { error } = await supabase.rpc("admin_toggle_user_role", {
        _target_user_id: userId,
        _make_admin: makeAdmin,
      });

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, is_admin: makeAdmin } : u
      ));

      toast.success(makeAdmin ? "Admin role granted" : "Admin role revoked");
    } catch (error: any) {
      console.error("Error toggling role:", error);
      toast.error("Failed to update role");
    } finally {
      setTogglingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.is_admin).length;
  const totalEmails = users.reduce((sum, u) => sum + u.email_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Admin Panel</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAdmins}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-500/10">
                  <Mail className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEmails}</p>
                  <p className="text-sm text-muted-foreground">Total Emails</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage user roles. Regular users are limited to 3 email addresses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <Collapsible
                  key={user.user_id}
                  open={expandedUsers.has(user.user_id)}
                  onOpenChange={() => toggleExpanded(user.user_id)}
                >
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {user.email_addresses[0] || "No email"}
                          </span>
                          {user.is_admin && (
                            <Badge variant="default" className="bg-amber-500">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        
                        {/* Auth Email */}
                        {user.auth_email && (
                          <div className="flex items-center gap-1.5 mb-2 text-sm text-muted-foreground">
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>Auth: {user.auth_email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{user.email_count} email{user.email_count !== 1 ? 's' : ''}</Badge>
                          <span className="text-xs text-muted-foreground">
                            ID: {user.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <span className="text-xs">View emails</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedUsers.has(user.user_id) ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">Admin</span>
                          <Switch
                            checked={user.is_admin}
                            onCheckedChange={(checked) => toggleAdminRole(user.user_id, checked)}
                            disabled={togglingUser === user.user_id}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground mb-2 pt-3">All Email Addresses:</p>
                        <div className="flex flex-wrap gap-2">
                          {user.email_addresses.map((email, idx) => (
                            <span
                              key={idx}
                              className="text-sm px-3 py-1.5 rounded-md bg-background border text-foreground"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;