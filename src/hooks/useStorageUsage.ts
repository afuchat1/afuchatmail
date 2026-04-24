import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface StorageUsage {
  usedBytes: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useStorageUsage(user: User | null): StorageUsage {
  const [usedBytes, setUsedBytes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setUsedBytes(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_user_storage_used_bytes", {
      _user_id: user.id,
    });
    if (!error && data !== null && data !== undefined) {
      setUsedBytes(Number(data) || 0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usedBytes, loading, refresh };
}
