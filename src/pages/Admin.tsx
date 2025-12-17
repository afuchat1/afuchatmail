import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Shield, Users, Mail, Crown, ChevronDown, KeyRound, Ban, Eye, Inbox, Send, AlertTriangle, Check } from "lucide-react";
import { format } from "date-fns";

interface UserData {
  user_id: string;
  auth_email: string | null;
  email_count: number;
  is_admin: boolean;
  email_addresses: string[];
  created_at: string;
  is_banned?: boolean;
  ban_reason?: string | null;
}

interface UserEmail {
  id: string;
  subject: string;
  from_address: string;
  to_addresses: string[];
  body_text: string | null;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  folder_type: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // Email viewing
  const [viewingEmails, setViewingEmails] = useState<string | null>(null);
  const [userEmails, setUserEmails] = useState<UserEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  
  // Ban dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<UserData | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banningUser, setBanningUser] = useState(false);

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
      
      // Get ban status for each user
      const usersWithBanStatus = await Promise.all(
        (data || []).map(async (u: UserData) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("banned_at, ban_reason")
            .eq("id", u.user_id)
            .maybeSingle();
          
          return {
            ...u,
            is_banned: !!profile?.banned_at,
            ban_reason: profile?.ban_reason
          };
        })
      );
      
      setUsers(usersWithBanStatus);
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

  const viewUserEmails = async (userId: string) => {
    setViewingEmails(userId);
    setLoadingEmails(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_user_emails", {
        _target_user_id: userId
      });

      if (error) throw error;
      setUserEmails(data || []);
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      toast.error("Failed to load user emails");
    } finally {
      setLoadingEmails(false);
    }
  };

  const openBanDialog = (user: UserData) => {
    setBanTargetUser(user);
    setBanReason("");
    setBanDialogOpen(true);
  };

  const handleBanUser = async () => {
    if (!banTargetUser) return;
    
    setBanningUser(true);
    try {
      const { error } = await supabase.rpc("admin_toggle_user_ban", {
        _target_user_id: banTargetUser.user_id,
        _ban: !banTargetUser.is_banned,
        _reason: banTargetUser.is_banned ? null : banReason || "Violation of terms of service"
      });

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === banTargetUser.user_id 
          ? { ...u, is_banned: !banTargetUser.is_banned, ban_reason: banTargetUser.is_banned ? null : banReason }
          : u
      ));

      toast.success(banTargetUser.is_banned ? "User unbanned" : "User banned");
      setBanDialogOpen(false);
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast.error("Failed to update ban status");
    } finally {
      setBanningUser(false);
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
  const bannedUsers = users.filter(u => u.is_banned).length;

  const viewingUser = users.find(u => u.user_id === viewingEmails);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Ban className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bannedUsers}</p>
                  <p className="text-sm text-muted-foreground">Banned</p>
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
              Manage user roles, view emails, and moderate accounts.
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
                  <div className={`rounded-lg border overflow-hidden ${user.is_banned ? 'border-destructive/50 bg-destructive/5' : 'bg-card'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-foreground">
                            {user.email_addresses?.[0] || "No email"}
                          </span>
                          {user.is_admin && (
                            <Badge variant="default" className="bg-amber-500">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {user.is_banned && (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              Banned
                            </Badge>
                          )}
                        </div>
                        
                        {user.auth_email && (
                          <div className="flex items-center gap-1.5 mb-2 text-sm text-muted-foreground">
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>Auth: {user.auth_email}</span>
                          </div>
                        )}
                        
                        {user.is_banned && user.ban_reason && (
                          <div className="flex items-center gap-1.5 mb-2 text-sm text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Reason: {user.ban_reason}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{user.email_count} email{user.email_count !== 1 ? 's' : ''}</Badge>
                          <span className="text-xs text-muted-foreground">
                            ID: {user.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => viewUserEmails(user.user_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Emails
                        </Button>
                        
                        <Button 
                          variant={user.is_banned ? "outline" : "destructive"} 
                          size="sm"
                          onClick={() => openBanDialog(user)}
                        >
                          {user.is_banned ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Unban
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              Ban
                            </>
                          )}
                        </Button>
                        
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1">
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

      {/* Email Viewer Dialog */}
      <Dialog open={!!viewingEmails} onOpenChange={(open) => !open && setViewingEmails(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails for {viewingUser?.email_addresses?.[0] || "Unknown"}
            </DialogTitle>
            <DialogDescription>
              Viewing the last 100 emails (sent and received)
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {loadingEmails ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : userEmails.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                No emails found for this user
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {userEmails.map((email) => (
                  <div key={email.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {email.folder_type === 'sent' ? (
                            <Badge variant="outline" className="text-cyan-500 border-cyan-500/30">
                              <Send className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-primary border-primary/30">
                              <Inbox className="h-3 w-3 mr-1" />
                              {email.folder_type || 'Inbox'}
                            </Badge>
                          )}
                          {!email.is_read && (
                            <Badge variant="secondary">Unread</Badge>
                          )}
                        </div>
                        <h4 className="font-medium truncate">{email.subject || "(No subject)"}</h4>
                        <p className="text-sm text-muted-foreground">
                          From: {email.from_address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          To: {email.to_addresses.join(", ")}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(email.sent_at || email.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    {email.body_text && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                          {email.body_text.slice(0, 500)}{email.body_text.length > 500 ? '...' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              {banTargetUser?.is_banned ? "Unban User" : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {banTargetUser?.is_banned 
                ? `Are you sure you want to unban ${banTargetUser?.email_addresses?.[0] || "this user"}?`
                : `This will prevent ${banTargetUser?.email_addresses?.[0] || "this user"} from accessing their account.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {!banTargetUser?.is_banned && (
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Ban Reason</label>
              <Textarea
                placeholder="Enter the reason for banning this user..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={banTargetUser?.is_banned ? "default" : "destructive"} 
              onClick={handleBanUser}
              disabled={banningUser}
            >
              {banningUser ? "Processing..." : banTargetUser?.is_banned ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
