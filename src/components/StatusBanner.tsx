import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "operational" | "degraded" | "down" | "checking";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const POLL_MS = 60_000;
const TIMEOUT = 6_000;
const DISMISS_KEY = "afuchat:status-banner-dismissed";
const DISMISS_TTL = 30 * 60 * 1000; // 30 min

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); res(v); }).catch(e => { clearTimeout(t); rej(e); });
  });
}

async function probe(url: string, init?: RequestInit) {
  const start = performance.now();
  try {
    const r = await withTimeout(fetch(url, { cache: "no-store", ...init }));
    return { ok: r.status < 500, ms: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - start) };
  }
}

export function StatusBanner() {
  const [state, setState] = useState<State>("checking");
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Read dismissal from sessionStorage with a 30-min TTL
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { until } = JSON.parse(raw);
        if (typeof until === "number" && Date.now() < until) setDismissed(true);
      }
    } catch {}
  }, []);

  const check = useCallback(async () => {
    if (!SUPABASE_URL) return;
    const [auth, db, fn] = await Promise.all([
      probe(`${SUPABASE_URL}/auth/v1/health`),
      probe(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON}`, { method: "HEAD" }),
      probe(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "OPTIONS",
        headers: {
          "Access-Control-Request-Method": "POST",
          Origin: window.location.origin,
        },
      }),
    ]);
    const checks = [auth, db, fn];
    const downCount = checks.filter(c => !c.ok).length;
    const slowCount = checks.filter(c => c.ok && c.ms > 1500).length;
    let next: State;
    if (downCount > 0) next = "down";
    else if (slowCount > 0 || !navigator.onLine) next = "degraded";
    else next = "operational";

    setState(prev => {
      // If status improves, clear any stale dismissal
      if (prev !== "operational" && next === "operational") {
        try { sessionStorage.removeItem(DISMISS_KEY); } catch {}
        setDismissed(false);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    check();
    const id = window.setInterval(check, POLL_MS);
    timerRef.current = id;
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [check]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify({ until: Date.now() + DISMISS_TTL }));
    } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;
  if (state !== "down" && state !== "degraded") return null;

  const isDown = state === "down";
  const Icon = isDown ? AlertCircle : AlertTriangle;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="status-banner"
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm border-b",
        isDown
          ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="flex-1 min-w-0 truncate font-medium">
        {isDown ? "Some services are not responding right now." : "Services are responding slower than usual."}
      </p>
      <Link
        to="/status"
        className="shrink-0 underline underline-offset-2 font-semibold hover:no-underline"
        data-testid="link-status-banner"
      >
        Details
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 hover:bg-foreground/5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default StatusBanner;
