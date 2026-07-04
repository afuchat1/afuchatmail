import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0052ff" />
    <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // If a stale session exists, sign it out so the new password takes effect
    // cleanly and the user re-authenticates.
    supabase.auth.signOut().catch(() => {});
  }, []);

  const invalidLink = !token || token.length < 32;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: "destructive", title: "Weak password", description: "Use at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Retype the same password twice." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { token, new_password: password },
      });
      if (error) throw new Error(error.message || "Reset failed");
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
      setTimeout(() => navigate("/auth"), 2500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reset failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <LogoIcon />
          <span className="text-base font-semibold tracking-tight">AfuChat Mail</span>
        </div>

        {invalidLink ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
            <p className="text-sm text-muted-foreground">
              This link is missing or malformed. Request a new one from the forgot-password page.
            </p>
            <Link to="/forgot-password" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-xl font-bold tracking-tight">Password updated</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              You can now sign in with your new password. Redirecting…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1">Set a new password</h1>
              <p className="text-sm text-muted-foreground">
                Choose a strong password you haven't used before.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-sm font-medium">New password</Label>
                <div className="relative">
                  <Input
                    id="new"
                    type={show ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-10 h-10 rounded text-sm"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShow((v) => !v)} tabIndex={-1}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  placeholder="Retype your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="h-10 rounded text-sm"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full h-10 rounded font-semibold" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
