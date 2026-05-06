import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Only services whose outage actually breaks core mail flow.
const CRITICAL_SERVICES = new Set([
  "database",
  "auth",
  "send-email",
  "receive-email",
]);

const POLL_MS = 60_000;
const DISMISS_KEY = "afuchat:incident-banner-dismissed";

type Incident = {
  id: string;
  service_id: string;
  severity: "degraded" | "down";
  title: string;
  summary: string;
};

export function IncidentBanner() {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(DISMISS_KEY);
      if (v) setDismissedId(v);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("status_incidents")
        .select("id, service_id, severity, title, summary")
        .eq("status", "open")
        .in("service_id", Array.from(CRITICAL_SERVICES))
        .order("severity", { ascending: false }) // 'down' before 'degraded'
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setIncident((data as Incident) ?? null);
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  if (!incident || dismissedId === incident.id) return null;

  const isDown = incident.severity === "down";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="incident-banner"
      className={cn(
        "flex items-start gap-2 px-3 py-2 text-xs sm:text-sm border-b",
        isDown
          ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{incident.title}</p>
        <p className="opacity-90 line-clamp-2">{incident.summary}</p>
      </div>
      <Link
        to="/status"
        className="shrink-0 underline underline-offset-2 font-semibold hover:no-underline mt-0.5"
      >
        Details
      </Link>
      <button
        onClick={() => {
          try { sessionStorage.setItem(DISMISS_KEY, incident.id); } catch {}
          setDismissedId(incident.id);
        }}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 hover:bg-foreground/5 mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default IncidentBanner;
