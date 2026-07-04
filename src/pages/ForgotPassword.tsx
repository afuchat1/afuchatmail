import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AtSign, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0052ff" />
    <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ForgotPassword() {
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const value = recoveryEmail.trim().toLowerCase();
      if (!value.includes("@")) {
        throw new Error("Enter a full AfuChat email address (name@afuchat.com).");
      }
      const { error } = await supabase.functions.invoke("request-password-reset", {
        body: { recovery_email: value, origin: window.location.origin },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not send reset", description: err.message });
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

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-xl font-bold tracking-tight">Check the recovery inbox</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              If <span className="text-foreground font-medium">{recoveryEmail}</span> is registered as
              a recovery address for an AfuChat account, a reset link has been delivered to its
              inbox. The link expires in 60 minutes and can be used once.
            </p>
            <p className="text-sm text-muted-foreground">
              Ask the owner of that inbox to open the message and forward you the reset link, or
              sign in there yourself to use it.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1">Forgot your password?</h1>
              <p className="text-sm text-muted-foreground">
                Enter the <strong>recovery email</strong> you added when creating your account. We'll
                send a reset link to that inbox.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recoveryEmail" className="text-sm font-medium">Recovery email</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recoveryEmail"
                    type="email"
                    placeholder="friend@afuchat.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    className="pl-9 h-10 rounded text-sm"
                    autoFocus
                    spellCheck={false}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Must be the AfuChat address you (or a trusted friend) saved as your recovery.
                </p>
              </div>
              <Button type="submit" className="w-full h-10 rounded font-semibold" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/auth" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
