import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { supabase } from '../lib/supabase';

type StatusState = 'operational' | 'degraded' | 'down' | 'checking';

const POLL_MS = 60_000;
const TIMEOUT_MS = 6_000;

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); res(v); }).catch(e => { clearTimeout(t); rej(e); });
  });
}

async function probe(url: string, options?: RequestInit): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const r = await withTimeout(fetch(url, { cache: 'no-store', ...options }));
    return { ok: r.status < 500, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const TONE: Record<StatusState, string> = {
  operational: '#34A853',
  degraded:    '#FBBC04',
  down:        '#EA4335',
  checking:    '#9AA0A6',
};

const LABEL: Record<StatusState, string> = {
  operational: 'All systems operational',
  degraded:    'Degraded performance',
  down:        'Service disruption',
  checking:    'Checking status…',
};

interface Props {
  showWhenOk?: boolean;
  style?: object;
}

export function StatusDot({ showWhenOk = true, style }: Props) {
  const [state, setState] = useState<StatusState>('checking');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    if (!SUPABASE_URL) return;
    try {
      const [auth, db] = await Promise.all([
        probe(`${SUPABASE_URL}/auth/v1/health`),
        probe(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON}`, { method: 'HEAD' }),
      ]);
      const checks = [auth, db];
      const downCount = checks.filter(c => !c.ok).length;
      const slowCount = checks.filter(c => c.ok && c.ms > 1500).length;
      setState(downCount > 0 ? 'down' : slowCount > 0 ? 'degraded' : 'operational');
    } catch {
      setState('degraded');
    }
  }, []);

  // Pulse animation for degraded/down
  useEffect(() => {
    if (state === 'down' || state === 'degraded') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.8, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  useEffect(() => {
    check();
    timerRef.current = setInterval(check, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [check]);

  if (state === 'operational' && !showWhenOk) return null;

  const dotColor = TONE[state];

  return (
    <TouchableOpacity style={[styles.container, style]} activeOpacity={0.7}>
      <View style={styles.dotWrap}>
        {(state === 'down' || state === 'degraded') && (
          <Animated.View
            style={[
              styles.pulse,
              { backgroundColor: dotColor, transform: [{ scale: pulseAnim }] },
            ]}
          />
        )}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
});

export default StatusDot;
