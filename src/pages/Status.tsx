import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Activity, Mail, Shield,
  Database, Radio, HardDrive, Sparkles, MessageCircle, CreditCard, Bell,
  RefreshCw, Loader2, Globe,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type ServiceState = "operational" | "degraded" | "down" | "checking";

interface ServiceMeta {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ServiceResult {
  state: ServiceState;
  ms: number;
  checkedAt: number;
}

interface DayBucket {
  day: string;       // YYYY-MM-DD (UTC)
  total: number;
  ok: number;
  fail: number;
  slow: number;
  msMin: number;
  msMax: number;
  msSum: number;
  lastFailAt?: number;
}

const HISTORY_BUCKETS = 90;          // 90 days, like Supabase's status page
const REFRESH_MS      = 30_000;      // re-pull shared data every 30s

// UTC day key — must match the Postgres-side bucket boundary.
function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDayLabel(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    out.push(dayKey(d.getTime()));
  }
  return out;
}

// ─── Service catalog (display metadata only) ────────────────────────────────
//   IDs must match the server-side probe IDs in supabase/functions/status-probe.

const SERVICES: ServiceMeta[] = [
  { id: "web",           name: "Web Application",    description: "Frontend application & PWA shell",        icon: Globe },
  { id: "auth",          name: "Authentication",     description: "Sign-in, OAuth & session management",     icon: Shield },
  { id: "database",      name: "Database",           description: "Postgres REST API & realtime queries",    icon: Database },
  { id: "realtime",      name: "Realtime",           description: "Live updates for inbox & threads",        icon: Radio },
  { id: "storage",       name: "Storage",            description: "Avatars, attachments & uploads",          icon: HardDrive },
  { id: "send-email",    name: "Mail Delivery",      description: "Outbound email via send-email function",  icon: Mail },
  { id: "receive-email", name: "Inbound Mail",       description: "Inbox webhook for incoming messages",     icon: Mail },
  { id: "push",          name: "Push Notifications", description: "Web Push & device alerts",                icon: Bell },
  { id: "ai-assist",     name: "AI Assistant",       description: "Smart replies & writing assistance",      icon: Sparkles },
  { id: "telegram",      name: "Telegram Bot",       description: "Notifications & inbox via Telegram",      icon: MessageCircle },
  { id: "payments",      name: "Payments",           description: "SkyPay checkout & subscription confirmations", icon: CreditCard },
  { id: "afumail-api",   name: "OAuth API",          description: "Public mail API & developer OAuth",       icon: Activity },
];

type HistoryMap = Record<string, Record<string, DayBucket>>;
//                          serviceId    dayKey    bucket

// ─── Component ──────────────────────────────────────────────────────────────

const Status = () => {
  const [results, setResults]   = useState<Record<string, ServiceResult>>({});
  const [history, setHistory]   = useState<HistoryMap>({});
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Pull shared data from Supabase so every visitor sees the same numbers.
  const fetchSharedData = useCallback(async () => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - HISTORY_BUCKETS);
    const sinceIso = since.toISOString().slice(0, 10);

    const [latestRes, dailyRes] = await Promise.all([
      supabase
        .from("status_latest")
        .select("service_id, state, ms, checked_at"),
      supabase
        .from("status_daily")
        .select("service_id, day, total, ok, fail, slow, ms_min, ms_max, ms_sum, last_fail_at")
        .gte("day", sinceIso)
        .order("day", { ascending: true }),
    ]);

    if (!latestRes.error && latestRes.data) {
      const next: Record<string, ServiceResult> = {};
      let newest = 0;
      for (const row of latestRes.data) {
        const checkedAt = new Date(row.checked_at).getTime();
        next[row.service_id] = {
          state: (row.state as ServiceState) ?? "checking",
          ms: row.ms ?? 0,
          checkedAt,
        };
        if (checkedAt > newest) newest = checkedAt;
      }
      setResults(next);
      if (newest) setLastChecked(newest);
    }

    if (!dailyRes.error && dailyRes.data) {
      const map: HistoryMap = {};
      for (const row of dailyRes.data) {
        const byDay = (map[row.service_id] ||= {});
        byDay[row.day] = {
          day: row.day,
          total: row.total,
          ok: row.ok,
          fail: row.fail,
          slow: row.slow,
          msMin: row.ms_min,
          msMax: row.ms_max,
          msSum: Number(row.ms_sum),
          lastFailAt: row.last_fail_at ? new Date(row.last_fail_at).getTime() : undefined,
        };
      }
      setHistory(map);
    }

    setLoading(false);
  }, []);

  // Trigger a fresh server-side probe, then re-pull shared data.
  const triggerProbe = useCallback(async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("status-probe", { body: {} });
    } catch {
      /* swallow — fetchSharedData will still show whatever is in the table */
    }
    await fetchSharedData();
    setRefreshing(false);
  }, [fetchSharedData]);

  useEffect(() => {
    fetchSharedData();
    const id = window.setInterval(fetchSharedData, REFRESH_MS);
    tickRef.current = id;
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [fetchSharedData]);

  return (
    <PageLayout title="Status">
      {/* ── Services ───────────────────────────────────────────────────── */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between mb-1 gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {HISTORY_BUCKETS}-day uptime history
              {lastChecked && <> · checked {timeAgo(lastChecked)}</>}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerProbe}
            disabled={refreshing || loading}
            className="rounded-lg shrink-0"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        <div className="rounded-2xl border bg-card overflow-hidden">
          {SERVICES.map((svc, i) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              result={results[svc.id]}
              byDay={history[svc.id] ?? {}}
              divider={i !== SERVICES.length - 1}
            />
          ))}
        </div>
      </section>

    </PageLayout>
  );
};

export default Status;

// ─── Service row ────────────────────────────────────────────────────────────

function ServiceRow({
  service, result, byDay, divider,
}: {
  service: ServiceMeta;
  result?: ServiceResult;
  byDay: Record<string, DayBucket>;
  divider: boolean;
}) {
  const Icon = service.icon;
  const state: ServiceState = result?.state ?? "checking";

  const days = useMemo(() => lastNDays(HISTORY_BUCKETS), []);
  const buckets = useMemo(() => days.map(d => byDay[d]), [days, byDay]);

  const { upPct, recordedDays } = useMemo(() => {
    const recorded = buckets.filter(Boolean) as DayBucket[];
    if (recorded.length === 0) return { upPct: null as number | null, recordedDays: 0 };
    const total = recorded.reduce((s, b) => s + b.total, 0);
    const ok    = recorded.reduce((s, b) => s + b.ok, 0);
    return { upPct: total > 0 ? (ok / total) * 100 : 100, recordedDays: recorded.length };
  }, [buckets]);

  return (
    <div className={cn("p-4 sm:p-5", divider && "border-b border-border/60")}>
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{service.name}</h3>
            <StatusPill state={state} />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{service.description}</p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-xs font-mono text-muted-foreground">
            {result ? `${result.ms} ms` : "—"}
          </p>
          {upPct !== null && (
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              {upPct.toFixed(2)}% uptime
            </p>
          )}
        </div>
      </div>

      {/* Daily uptime bars (clickable) */}
      <div className="mt-3 ml-0 sm:ml-14">
        <div className="flex items-stretch gap-[2px] h-7">
          {days.map((d, i) => (
            <DayBar key={d} day={d} bucket={buckets[i]} serviceName={service.name} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{recordedDays > 0 ? `${recordedDays} of ${HISTORY_BUCKETS} days recorded` : "no history yet"}</span>
          <span>today</span>
        </div>
      </div>
    </div>
  );
}

// ─── Day bar with click popover ─────────────────────────────────────────────

function DayBar({
  day, bucket, serviceName,
}: { day: string; bucket?: DayBucket; serviceName: string }) {
  const tone =
    !bucket ? "bg-muted/40 hover:bg-muted/60"
    : bucket.fail > 0 ? "bg-red-500/80 hover:bg-red-500"
    : bucket.slow > 0 ? "bg-amber-500/80 hover:bg-amber-500"
    : "bg-emerald-500/70 hover:bg-emerald-500";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${serviceName} on ${formatDayLabel(day)}`}
          className={cn(
            "flex-1 min-w-0 rounded-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
            tone,
          )}
          data-testid={`status-bar-${day}`}
        />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3">
        <DayDetails day={day} bucket={bucket} />
      </PopoverContent>
    </Popover>
  );
}

function DayDetails({ day, bucket }: { day: string; bucket?: DayBucket }) {
  if (!bucket) {
    return (
      <div>
        <p className="text-xs font-semibold">{formatDayLabel(day)}</p>
        <p className="mt-1 text-xs text-muted-foreground">No checks recorded for this day.</p>
      </div>
    );
  }
  const upPct = bucket.total > 0 ? (bucket.ok / bucket.total) * 100 : 100;
  const avg = bucket.total > 0 ? Math.round(bucket.msSum / bucket.total) : 0;
  const dotTone =
    bucket.fail > 0 ? "bg-red-500"
    : bucket.slow > 0 ? "bg-amber-500"
    : "bg-emerald-500";
  const headline =
    bucket.fail > 0 ? `${bucket.fail} failed check${bucket.fail === 1 ? "" : "s"}`
    : bucket.slow > 0 ? `${bucket.slow} slow check${bucket.slow === 1 ? "" : "s"}`
    : "All checks passed";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{formatDayLabel(day)}</p>
        <span className="text-[10px] font-mono text-muted-foreground">{upPct.toFixed(2)}% up</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotTone)} />
        <p className="text-xs">{headline}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t border-border/60 text-[11px]">
        <span className="text-muted-foreground">Checks</span>
        <span className="text-right font-mono">{bucket.total}</span>
        <span className="text-muted-foreground">OK</span>
        <span className="text-right font-mono text-emerald-600 dark:text-emerald-400">{bucket.ok}</span>
        {bucket.fail > 0 && <>
          <span className="text-muted-foreground">Failed</span>
          <span className="text-right font-mono text-red-600 dark:text-red-400">{bucket.fail}</span>
        </>}
        {bucket.slow > 0 && <>
          <span className="text-muted-foreground">Slow</span>
          <span className="text-right font-mono text-amber-600 dark:text-amber-400">{bucket.slow}</span>
        </>}
        <span className="text-muted-foreground">Avg latency</span>
        <span className="text-right font-mono">{avg} ms</span>
        <span className="text-muted-foreground">Range</span>
        <span className="text-right font-mono">{bucket.msMin}–{bucket.msMax} ms</span>
        {bucket.lastFailAt && <>
          <span className="text-muted-foreground">Last failure</span>
          <span className="text-right font-mono">{new Date(bucket.lastFailAt).toLocaleTimeString()}</span>
        </>}
      </div>
    </div>
  );
}

// ─── Status pill ────────────────────────────────────────────────────────────

function StatusPill({ state }: { state: ServiceState }) {
  const tones: Record<ServiceState, string> = {
    operational: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    degraded:    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    down:        "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    checking:    "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<ServiceState, string> = {
    operational: "Operational",
    degraded:    "Degraded",
    down:        "Down",
    checking:    "Checking",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      tones[state]
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        state === "operational" && "bg-emerald-500 animate-pulse",
        state === "degraded"    && "bg-amber-500 animate-pulse",
        state === "down"        && "bg-red-500",
        state === "checking"    && "bg-muted-foreground",
      )} />
      {labels[state]}
    </span>
  );
}

// ─── Util ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}
