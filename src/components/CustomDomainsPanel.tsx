import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Crown, Globe, Loader2, Plus, RefreshCw, Trash2, Copy, CheckCircle2, AlertCircle, Clock, Plug, ChevronDown, ChevronUp, ShieldCheck, Send, Inbox } from "lucide-react";
import { PLAN_LIMITS } from "@/hooks/usePlan";

type Tier = keyof typeof PLAN_LIMITS;

interface CustomDomain {
  id: string;
  domain: string;
  verification_token: string;
  status: "pending" | "verified" | "failed" | string;
  verified_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  catch_all: boolean;
  catch_all_address_id: string | null;
}

interface DomainAddress {
  id: string;
  local_part: string;
  full_email: string;
  is_primary: boolean;
  is_alias: boolean;
  created_at: string;
}

interface DnsRecordResult {
  kind: "TXT" | "MX" | "CNAME";
  purpose: "verification" | "mx" | "inbound_mx" | "spf" | "dkim" | "dmarc" | "other";
  host: string;            // host portion ("@" or "send", etc.)
  fqdn: string;            // full record name
  /** legacy field name kept for backward compatibility */
  name?: string;
  value: string;
  priority?: number;
  ttl?: string | number;
  required: boolean;
  description: string;
  status?: string;         // "verified" | "pending" | "not_started" — from provider
  direction?: "sending" | "receiving";
}


interface Props {
  user: User | null;
  tier: Tier;
  isAdmin: boolean;
  onUpgrade: () => void;
  onAddressCreated?: () => void;
}

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

const sectionWrap = "rounded-2xl border border-border/60 bg-card/40 p-5";

export function CustomDomainsPanel({ user, tier, isAdmin, onUpgrade, onAddressCreated }: Props) {
  const { toast } = useToast();
  const allowed = isAdmin || tier === "professional" || tier === "business";
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomDomain | null>(null);

  const fetchDomains = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_domains")
      .select("id, domain, verification_token, status, verified_at, last_checked_at, last_error, created_at, catch_all, catch_all_address_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setDomains(data as CustomDomain[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const domain = newDomain.trim().toLowerCase();
    if (!DOMAIN_REGEX.test(domain)) {
      toast({ title: "Invalid domain", description: "Enter a domain like mycompany.com.", variant: "destructive" });
      return;
    }
    if (domain === "afuchat.com") {
      toast({ title: "Reserved", description: "afuchat.com is the platform domain and cannot be added.", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from("custom_domains")
      .insert({ user_id: user.id, domain });
    setAdding(false);
    if (error) {
      toast({ title: "Could not add domain", description: error.message, variant: "destructive" });
      return;
    }
    setNewDomain("");
    toast({ title: "Domain added", description: "Add the DNS TXT record below, then click Verify." });
    fetchDomains();
  };

  const handleVerify = async (d: CustomDomain) => {
    setVerifyingId(d.id);
    try {
      const { data, error } = await supabase.functions.invoke("custom-domain-dns", {
        body: { action: "check", domain_id: d.id },
      });
      if (error) throw error;
      const sending = !!data?.sending_ready;
      const receiving = !!data?.receiving_ready;
      if (sending && receiving) {
        toast({ title: "Domain fully configured", description: `${d.domain} can send and receive mail.` });
      } else if (sending) {
        toast({
          title: "Sending ready, receiving not",
          description: "Add the inbound MX record so mail addressed to your domain reaches your inbox.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Not verified yet",
          description: data?.error || "Some DNS records are still missing. Changes can take a few minutes to propagate.",
          variant: "destructive",
        });
      }
      fetchDomains();
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };


  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("custom_domains").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domain removed" });
    fetchDomains();
  };

  const copyToken = (d: CustomDomain) => {
    const value = `afuchat-verify=${d.verification_token}`;
    navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: "TXT record value copied." });
  };

  if (!allowed) {
    return (
      <div className={sectionWrap}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Custom domains</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Send and receive mail at your own domain (you@yourcompany.com). Available on the
              Professional plan and above.
            </p>
            <Button size="sm" className="rounded-lg mt-3" onClick={onUpgrade}>
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Upgrade to unlock
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={sectionWrap}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Add a custom domain</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the apex domain you want to use (e.g. <span className="font-mono">acme.co</span>),
              then add the DNS TXT record we show you to prove ownership.
            </p>
            <form onSubmit={handleAdd} className="flex gap-2 mt-3">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="acme.co"
                className="h-9 rounded-lg font-mono"
                disabled={adding}
              />
              <Button type="submit" disabled={adding || !newDomain.trim()} className="h-9 rounded-lg">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Add</>}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading domains…
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          You haven't added any custom domains yet.
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <DomainRow
              key={d.id}
              domain={d}
              user={user}
              isVerifying={verifyingId === d.id}
              onVerify={() => handleVerify(d)}
              onDelete={() => setDeleteTarget(d)}
              onCopyToken={() => copyToken(d)}
              onAddressCreated={() => {
                fetchDomains();
                onAddressCreated?.();
              }}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.domain}?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing the domain will not delete addresses you've already created on it, but the
              addresses will stop receiving mail until the domain is re-verified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DomainRow({
  domain,
  user,
  isVerifying,
  onVerify,
  onDelete,
  onCopyToken,
  onAddressCreated,
}: {
  domain: CustomDomain;
  user: User | null;
  isVerifying: boolean;
  onVerify: () => void;
  onDelete: () => void;
  onCopyToken: () => void;
  onAddressCreated: () => void;
}) {
  const { toast } = useToast();
  const [newLocalPart, setNewLocalPart] = useState("");
  const [creating, setCreating] = useState(false);
  const [dnsOpen, setDnsOpen] = useState(false);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecordResult[] | null>(null);
  const [dnsCheckedAt, setDnsCheckedAt] = useState<string | null>(null);
  const [dnsChecking, setDnsChecking] = useState(false);
  const [readiness, setReadiness] = useState<{ sending: boolean; receiving: boolean } | null>(null);
  const [catchAllSaving, setCatchAllSaving] = useState(false);
  const [catchAll, setCatchAll] = useState(!!domain.catch_all);
  const [catchAllTarget, setCatchAllTarget] = useState<string | null>(domain.catch_all_address_id);
  const [addresses, setAddresses] = useState<DomainAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [deleteAddr, setDeleteAddr] = useState<DomainAddress | null>(null);
  const [deletingAddr, setDeletingAddr] = useState(false);

  const fetchAddresses = useCallback(async () => {
    if (!user || domain.status !== "verified") return;
    setAddressesLoading(true);
    const { data, error } = await supabase
      .from("email_addresses")
      .select("id, local_part, full_email, is_primary, is_alias, created_at")
      .eq("user_id", user.id)
      .eq("domain", domain.domain)
      .order("created_at", { ascending: false });
    if (!error && data) setAddresses(data as DomainAddress[]);
    setAddressesLoading(false);
  }, [user, domain.domain, domain.status]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const callDns = useCallback(async (action: "records" | "check") => {
    const { data, error } = await supabase.functions.invoke("custom-domain-dns", {
      body: { action, domain_id: domain.id },
    });
    if (!error) return data;
    // Read the real response body — invoke() reports every non-2xx as a generic error.
    let payload: any = null;
    const ctx = (error as any)?.context;
    if (ctx && typeof ctx.text === "function") {
      try { payload = JSON.parse(await ctx.text()); } catch { /* ignore */ }
    }
    const err: any = new Error(payload?.error || error.message);
    err.code = payload?.code;
    throw err;
  }, [domain.id]);

  const loadRecords = useCallback(async () => {
    setDnsLoading(true);
    try {
      const data = await callDns("records");
      setDnsRecords((data?.records || []).map((r: any) => ({ ...r })));
      if (typeof data?.sending_ready === "boolean") {
        setReadiness({ sending: !!data.sending_ready, receiving: !!data.receiving_ready });
      }
      setDnsError(null);
    } catch (err: any) {
      const limit = err?.code === "PROVIDER_DOMAIN_LIMIT";
      setDnsError(err?.message || String(err));
      toast({
        title: limit ? "Email provider domain limit reached" : "Could not load DNS records",
        description: limit
          ? "The email provider plan on this account allows only one sending domain. Upgrade it to add more."
          : err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setDnsLoading(false);
    }
  }, [callDns, toast]);

  const runDnsCheck = useCallback(async () => {
    setDnsChecking(true);
    try {
      const data = await callDns("check");
      setDnsRecords(data?.records || []);
      setDnsCheckedAt(data?.checked_at || new Date().toISOString());
      setReadiness({ sending: !!data?.sending_ready, receiving: !!data?.receiving_ready });
      setDnsError(null);
      const bothOk = !!data?.sending_ready && !!data?.receiving_ready;
      toast({
        title: bothOk ? "Sending and receiving ready" : "Some records missing",
        description: bothOk
          ? "Your domain is correctly configured for AfuChat mail."
          : !data?.receiving_ready && data?.sending_ready
            ? "Sending works. Add the inbound MX record to receive mail."
            : "DNS changes can take a few minutes to propagate.",
        variant: bothOk ? "default" : "destructive",
      });
    } catch (err: any) {
      const limit = err?.code === "PROVIDER_DOMAIN_LIMIT";
      setDnsError(err?.message || String(err));
      toast({
        title: limit ? "Email provider domain limit reached" : "DNS check failed",
        description: limit
          ? "The email provider plan on this account allows only one sending domain. Upgrade it to add more."
          : err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setDnsChecking(false);
    }
  }, [callDns, toast]);


  const saveCatchAll = useCallback(
    async (enabled: boolean, addressId: string | null) => {
      setCatchAllSaving(true);
      const { error } = await supabase.rpc("set_domain_catch_all", {
        _domain_id: domain.id,
        _enabled: enabled,
        _address_id: addressId,
      });
      setCatchAllSaving(false);
      if (error) {
        toast({ title: "Could not update catch-all", description: error.message, variant: "destructive" });
        return;
      }
      setCatchAll(enabled);
      setCatchAllTarget(addressId);
      toast({
        title: enabled ? "Catch-all enabled" : "Catch-all disabled",
        description: enabled
          ? "Mail sent to any address on this domain will land in the selected mailbox."
          : "Only mail to addresses you created will be accepted.",
      });
    },
    [domain.id, toast],
  );


  useEffect(() => {
    if (dnsOpen && !dnsRecords && !dnsLoading) {
      loadRecords();
    }
  }, [dnsOpen, dnsRecords, dnsLoading, loadRecords]);

  const statusBadge = (() => {
    if (domain.status === "verified") {
      return (
        <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> Verified
        </Badge>
      );
    }
    if (domain.status === "failed") {
      return (
        <Badge variant="destructive" className="text-[10px] gap-1">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  })();

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const local = newLocalPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(local) || local.length < 3 || local.length > 30) {
      toast({
        title: "Invalid name",
        description: "Use 3–30 lowercase letters, numbers, dots or hyphens.",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    const { error } = await supabase.rpc("create_custom_domain_address", {
      _domain_id: domain.id,
      _local_part: local,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Could not create address", description: error.message, variant: "destructive" });
      return;
    }
    setNewLocalPart("");
    toast({ title: "Address created", description: `${local}@${domain.domain} is now active.` });
    fetchAddresses();
    onAddressCreated();
  };

  const handleDeleteAddress = async () => {
    if (!deleteAddr) return;
    setDeletingAddr(true);
    const { error } = await supabase
      .from("email_addresses")
      .delete()
      .eq("id", deleteAddr.id);
    setDeletingAddr(false);
    if (error) {
      toast({ title: "Could not delete address", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Address removed", description: `${deleteAddr.full_email} no longer receives mail.` });
    setDeleteAddr(null);
    fetchAddresses();
    onAddressCreated();
  };

  return (
    <div className={sectionWrap + " space-y-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold font-mono truncate">{domain.domain}</p>
            {statusBadge}
            {readiness && (
              <>
                <Badge
                  variant="outline"
                  className={`text-[9px] gap-1 ${readiness.sending ? "text-emerald-600 border-emerald-500/30" : "text-amber-600 border-amber-500/30"}`}
                >
                  <Send className="h-2.5 w-2.5" /> {readiness.sending ? "Sending ready" : "Sending pending"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[9px] gap-1 ${readiness.receiving ? "text-emerald-600 border-emerald-500/30" : "text-amber-600 border-amber-500/30"}`}
                >
                  <Inbox className="h-2.5 w-2.5" /> {readiness.receiving ? "Receiving ready" : "Receiving pending"}
                </Badge>
              </>
            )}
          </div>

          {domain.status === "verified" && domain.verified_at && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Verified {new Date(domain.verified_at).toLocaleDateString()}
            </p>
          )}
          {domain.status !== "verified" && domain.last_error && (
            <p className="text-[11px] text-destructive mt-1 line-clamp-2">{domain.last_error}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={onVerify} disabled={isVerifying}>
            {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1.5 text-xs">{domain.status === "verified" ? "Re-check" : "Verify"}</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* DNS instructions */}
      <div className="rounded-xl bg-muted/40 border border-border/40 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Plug className="h-3 w-3" /> DNS verification record
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg text-xs"
            onClick={() => setDnsOpen((o) => !o)}
          >
            {dnsOpen ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
            {dnsOpen ? "Hide all DNS records" : "Show all DNS records"}
          </Button>
        </div>

        <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center text-xs">
          <span className="text-muted-foreground">Type</span>
          <code className="font-mono bg-background px-2 py-1 rounded border border-border/40">TXT</code>
          <span />
          <span className="text-muted-foreground">Name</span>
          <code className="font-mono bg-background px-2 py-1 rounded border border-border/40 truncate">@ (root)</code>
          <span />
          <span className="text-muted-foreground">Value</span>
          <code className="font-mono bg-background px-2 py-1 rounded border border-border/40 truncate">afuchat-verify={domain.verification_token}</code>
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={onCopyToken}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Add this TXT record at your DNS provider, wait a couple of minutes, then click Verify.
          Once verified, add the MX/SPF records below so inbound mail reaches your inbox.
        </p>

        {dnsOpen && (
          <div className="pt-3 mt-2 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                All required records
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-lg text-xs"
                onClick={runDnsCheck}
                disabled={dnsChecking || dnsLoading}
              >
                {dnsChecking ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                Check DNS now
              </Button>
            </div>

            {dnsLoading && !dnsRecords ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading DNS records…
              </div>
            ) : dnsRecords && dnsRecords.length > 0 ? (
              <>
                {dnsCheckedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Last checked {new Date(dnsCheckedAt).toLocaleTimeString()}
                  </p>
                )}
                <div className="space-y-2">
                  {dnsRecords.map((r, idx) => {
                    const verified = r.status === "verified";
                    const pending = r.status && r.status !== "verified";
                    const displayName = r.host || r.name || r.fqdn || "@";
                    return (
                    <div key={`${r.purpose}-${r.kind}-${idx}`} className="rounded-lg bg-background/60 border border-border/40 p-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">{r.kind}</Badge>
                        <span className="text-xs font-medium uppercase tracking-wide">{r.purpose}</span>
                        {!r.required && <Badge variant="secondary" className="text-[9px]">Optional</Badge>}
                        {verified && (
                          <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </Badge>
                        )}
                        {pending && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertCircle className="h-3 w-3" /> {r.status}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-[70px_1fr_auto] gap-2 items-center text-[11px]">
                        <span className="text-muted-foreground">Name</span>
                        <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded truncate" title={r.fqdn || displayName}>{displayName}</code>
                        <span />
                        {typeof r.priority === "number" && (
                          <>
                            <span className="text-muted-foreground">Priority</span>
                            <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">{r.priority}</code>
                            <span />
                          </>
                        )}
                        <span className="text-muted-foreground">Value</span>
                        <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded truncate" title={r.value}>{r.value}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-md"
                          onClick={() => {
                            navigator.clipboard.writeText(r.value);
                            toast({ title: "Copied", description: `${r.purpose.toUpperCase()} value copied.` });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{r.description}</p>
                    </div>
                  );})}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No records loaded.</p>
            )}
          </div>
        )}
      </div>

      {/* Address management (only for verified domains) */}
      {domain.status === "verified" && (
        <div className="space-y-3">
          <form onSubmit={handleCreateAddress} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Add an address on this domain
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="hello"
                  value={newLocalPart}
                  onChange={(e) => setNewLocalPart(e.target.value.toLowerCase())}
                  pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                  minLength={3}
                  maxLength={30}
                  className="h-9 pr-32 rounded-lg font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none truncate max-w-[110px]">
                  @{domain.domain}
                </span>
              </div>
              <Button type="submit" disabled={creating} className="h-9 rounded-lg">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Create</>}
              </Button>
            </div>
          </form>

          {/* Catch-all routing */}
          <div className="rounded-xl bg-muted/40 border border-border/40 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Inbox className="h-3.5 w-3.5" /> Catch-all delivery
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Deliver mail sent to any address on {domain.domain} into one mailbox.
                </p>
              </div>
              <Switch
                checked={catchAll}
                disabled={catchAllSaving || addresses.length === 0}
                onCheckedChange={(v) =>
                  saveCatchAll(v, v ? (catchAllTarget ?? addresses[0]?.id ?? null) : null)
                }
              />
            </div>
            {catchAll && (
              <select
                className="w-full h-9 rounded-lg bg-background border border-border/40 px-2 text-xs font-mono"
                value={catchAllTarget ?? ""}
                disabled={catchAllSaving}
                onChange={(e) => saveCatchAll(true, e.target.value)}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_email}</option>
                ))}
              </select>
            )}
          </div>



          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Addresses on {domain.domain}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg"
                onClick={fetchAddresses}
                disabled={addressesLoading}
                title="Refresh"
              >
                {addressesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {addressesLoading && addresses.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading addresses…
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No addresses yet. Create your first address above.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {addresses.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-background/60 border border-border/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="font-mono text-xs truncate">{a.full_email}</code>
                      {a.is_primary && (
                        <Badge variant="secondary" className="text-[9px]">Primary</Badge>
                      )}
                      {a.is_alias && (
                        <Badge variant="outline" className="text-[9px]">Alias</Badge>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-lg text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeleteAddr(a)}
                      title="Remove address"
                      disabled={a.is_primary}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteAddr} onOpenChange={(o) => !o && !deletingAddr && setDeleteAddr(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteAddr?.full_email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This address will stop receiving mail immediately. Any stored mail for this address
              will remain in your account, but new messages will bounce. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAddr}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAddress(); }}
              disabled={deletingAddr}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAddr ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
