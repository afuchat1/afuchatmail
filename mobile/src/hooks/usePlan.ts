import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export type PlanTier = 'starter' | 'professional' | 'business' | 'admin';

export interface ActivePlan {
  tier: PlanTier;
  planId: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  isAdmin: boolean;
}

const DEFAULT: ActivePlan = {
  tier: 'starter',
  planId: null,
  status: null,
  currentPeriodEnd: null,
  isAdmin: false,
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLAN_LIMITS = {
  starter:      { primaryAddresses: 1,        aliases: 1,        customDomain: false, attachmentStorageBytes: 500 * MB,  attachmentStorageLabel: '500 MB', name: 'Starter'      },
  professional: { primaryAddresses: 3,        aliases: 5,        customDomain: true,  attachmentStorageBytes: 5 * GB,    attachmentStorageLabel: '5 GB',   name: 'Professional' },
  business:     { primaryAddresses: Infinity, aliases: 25,       customDomain: true,  attachmentStorageBytes: 25 * GB,   attachmentStorageLabel: '25 GB',  name: 'Business'     },
  admin:        { primaryAddresses: Infinity, aliases: Infinity, customDomain: true,  attachmentStorageBytes: Infinity,  attachmentStorageLabel: 'Unlimited', name: 'Admin'     },
} as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return 'Unlimited';
  if (bytes >= GB)   return `${(bytes / GB).toFixed(bytes >= 10 * GB ? 0 : 1)} GB`;
  if (bytes >= MB)   return `${(bytes / MB).toFixed(bytes >= 100 * MB ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function usePlan(user: User | null) {
  const [plan, setPlan] = useState<ActivePlan>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [{ data: roleRow }, { data: subRow }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
        (supabase as any).from('subscriptions').select('plan_id,status,current_period_end')
          .eq('user_id', userId).eq('status', 'active')
          .order('current_period_end', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const isAdmin = !!roleRow;
      const planId = subRow?.plan_id ?? null;
      const tier: PlanTier = isAdmin ? 'admin'
        : planId === 'business' ? 'business'
        : planId === 'professional' ? 'professional'
        : 'starter';
      setPlan({ tier, planId, status: subRow?.status ?? null, currentPeriodEnd: subRow?.current_period_end ?? null, isAdmin });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { setPlan(DEFAULT); setLoading(false); return; }
    fetchPlan(user.id);
  }, [user, fetchPlan]);

  return { plan, loading, refresh: () => { if (user) fetchPlan(user.id); } };
}

export function useStorageUsage(user: User | null) {
  const [usedBytes, setUsedBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState(Infinity);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.rpc('get_user_storage_used_bytes', { _user_id: user.id } as any),
      supabase.rpc('get_user_storage_quota_bytes', { _user_id: user.id } as any),
    ]).then(([used, quota]) => {
      if (!used.error && used.data !== null) setUsedBytes(Number(used.data) || 0);
      if (!quota.error && quota.data !== null) {
        const q = Number(quota.data);
        setQuotaBytes(q < 0 ? Infinity : q);
      }
    });
  }, [user?.id]);

  const usedPercent = quotaBytes === Infinity ? 0 : Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  return { usedBytes, quotaBytes, usedPercent };
}
