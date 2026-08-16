import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/config";

type State = "operational" | "degraded" | "down" | "checking";

const POLL_MS = 60_000;
const TIMEOUT = 6_000;

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); res(v); }).catch(e => { clearTimeout(t); rej(e); });
  });
}

async function probe(url: string, init?: RequestInit): Promise<{ ok: boolean; ms: number }> {
  const start = performance.now();
  try {
    const r = await withTimeout(fetch(url, { cache: "no-store", ...init }));
    return { ok: r.status < 500, ms: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - start) };
  }
}

interface Props {
  className?: string;
  /** Show when everything is OK. Default: true. Set false to only show on issues. */
  showWhenOk?: boolean;
}

export function StatusDot({ className, showWhenOk = true }: Props) {
  const [state, setState] = useState<State>("checking");
  const timerRef = useRef<number | null>(null);

  const check = useCallback(async () => {
    const [auth, db, fn] = await Promise.all([
      probe(`${SUPABASE_URL}/auth/v1/health`),
      probe(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_PUBLISHABLE_KEY}`, { method: "HEAD" }),
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
    if (downCount > 0) setState("down");
    else if (slowCount > 0 || !navigator.onLine) setState("degraded");
    else setState("operational");
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

  if (state === "operational" && !showWhenOk) return null;

  const tone = {
    operational: "bg-emerald-500",
    degraded:    "bg-amber-500",
    down:        "bg-red-500",
    checking:    "bg-muted-foreground/40",
  }[state];

  const ring = {
    operational: "ring-emerald-500/30",
    degraded:    "ring-amber-500/30",
    down:        "ring-red-500/30",
    checking:    "ring-transparent",
  }[state];

  const label = {
    operational: "All systems operational",
    degraded:    "Degraded performance",
    down:        "Service disruption",
    checking:    "Checking status…",
  }[state];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/status"
            aria-label={label}
            data-testid="link-status-dot"
            className={cn(
              "inline-flex items-center justify-center h-9 w-9 rounded flex-shrink-0",
              "text-muted-foreground hover:bg-muted/60 transition-colors",
              className,
            )}
          >
            <span className="relative inline-flex">
              <span
                className={cn(
                  "h-2 w-2 rounded-full ring-4 transition-colors",
                  tone,
                  ring,
                )}
              />
              {(state === "down" || state === "degraded") && (
                <span
                  className={cn(
                    "absolute inset-0 h-2 w-2 rounded-full animate-ping",
                    tone,
                    "opacity-60",
                  )}
                />
              )}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label} · view status
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default StatusDot;
