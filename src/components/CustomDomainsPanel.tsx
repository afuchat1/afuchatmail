import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Crown, Globe, Loader2, Plus, RefreshCw, Trash2, Copy, CheckCircle2, AlertCircle, Clock, Plug, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
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
}

interface DnsRecordResult {
  kind: "TXT" | "MX" | "CNAME";
  purpose: "verification" | "mx" | "spf" | "dkim" | "dmarc";
  name: string;
  value: string;
  priority?: number;
  required: boolean;
  description: string;
  found?: boolean;
  seen?: string[];
  error?: string | null;
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
      .select("id, domain, verification_token, status, verified_at, last_checked_at, last_error, created_at")
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
      const { data, error } = await supabase.functions.invoke("verify-custom-domain", {
        body: { domain_id: d.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Domain verified", description: `${d.domain} is now ready to use.` });
      } else {
        toast({
          title: "Not verified yet",
          description: data?.error || "TXT record not found. DNS changes can take a few minutes to propagate.",
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

  const loadRecords = useCallback(async () => {
    setDnsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("custom-domain-dns", {
        body: { action: "records", domain_id: domain.id },
      });
      if (error) throw error;
      setDnsRecords((data?.records || []).map((r: any) => ({ ...r })));
    } catch (err: any) {
      toast({ title: "Could not load DNS records", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setDnsLoading(false);
    }
  }, [domain.id, toast]);

  const runDnsCheck = useCallback(async () => {
    setDnsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("custom-domain-dns", {
        body: { action: "check", domain_id: domain.id },
      });
      if (error) throw error;
      setDnsRecords(data?.records || []);
      setDnsCheckedAt(data?.checked_at || new Date().toISOString());
      toast({
        title: data?.required_ok ? "All required records found" : "Some records missing",
        description: data?.required_ok
          ? "Your domain is correctly configured for AfuChat mail."
          : "DNS changes can take a few minutes to propagate.",
        variant: data?.required_ok ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "DNS check failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setDnsChecking(false);
    }
  }, [domain.id, toast]);

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
    onAddressCreated();
  };

  return (
    <div className={sectionWrap + " space-y-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold font-mono truncate">{domain.domain}</p>
            {statusBadge}
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
                  {dnsRecords.map((r) => (
                    <div key={`${r.purpose}-${r.kind}`} className="rounded-lg bg-background/60 border border-border/40 p-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">{r.kind}</Badge>
                        <span className="text-xs font-medium uppercase tracking-wide">{r.purpose}</span>
                        {!r.required && <Badge variant="secondary" className="text-[9px]">Optional</Badge>}
                        {typeof r.found === "boolean" && (
                          r.found ? (
                            <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Found
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertCircle className="h-3 w-3" /> Missing
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="grid grid-cols-[70px_1fr_auto] gap-2 items-center text-[11px]">
                        <span className="text-muted-foreground">Name</span>
                        <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded truncate">{r.name}</code>
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
                      {r.found === false && r.seen && r.seen.length > 0 && (
                        <p className="text-[10px] text-muted-foreground italic">
                          Seen at registrar: {r.seen.slice(0, 2).join(" | ")}{r.seen.length > 2 ? "…" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No records loaded.</p>
            )}
          </div>
        )}
      </div>

      {/* Create-address form (only for verified domains) */}
      {domain.status === "verified" && (
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
      )}
    </div>
  );
}
