import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanTier = "starter" | "professional" | "business" | "admin";

export interface ActivePlan {
  tier: PlanTier;
  planId: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  isAdmin: boolean;
}

const DEFAULT: ActivePlan = {
  tier: "starter",
  planId: null,
  status: null,
  currentPeriodEnd: null,
  isAdmin: false,
};

/**
 * Returns the user's effective plan tier. Combines admin role + active subscription.
 * Used to gate Business / Professional features in the UI.
 */
export function usePlan(user: User | null) {
  const [plan, setPlan] = useState<ActivePlan>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async (userId: string) => {
    setLoading(true);

    const [{ data: roleRow }, { data: subRow }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan_id,status,current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const isAdmin = !!roleRow;
    const planId = subRow?.plan_id ?? null;
    const tier: PlanTier = isAdmin
      ? "admin"
      : planId === "business"
        ? "business"
        : planId === "professional"
          ? "professional"
          : "starter";

    setPlan({
      tier,
      planId,
      status: subRow?.status ?? null,
      currentPeriodEnd: subRow?.current_period_end ?? null,
      isAdmin,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setPlan(DEFAULT);
      setLoading(false);
      return;
    }
    fetchPlan(user.id);
  }, [user, fetchPlan]);

  const refresh = useCallback(() => {
    if (user) fetchPlan(user.id);
  }, [user, fetchPlan]);

  return { plan, loading, refresh };
}

export const PLAN_LIMITS = {
  starter: { primaryAddresses: 1, customDomain: false, oauthApi: false, name: "Starter" },
  professional: { primaryAddresses: 3, customDomain: true, oauthApi: false, name: "Professional" },
  business: { primaryAddresses: Infinity, customDomain: true, oauthApi: true, name: "Business" },
  admin: { primaryAddresses: Infinity, customDomain: true, oauthApi: true, name: "Admin" },
} as const;
