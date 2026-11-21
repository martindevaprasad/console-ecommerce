import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { ApiError, gql } from './api';
import { Q } from './queries';
import { useSession } from './store';

// ------------------------------------------------------------------ live sync
//
// One cheap `syncState` poll drives every screen: when the location's revision
// changes, mounted queries refetch. When food lands at the pass for this
// waiter, the phone buzzes.

interface LiveState {
  revision: string;
  readyItems: number;
  openTables: number;
  online: boolean;
  set: (p: Partial<LiveState>) => void;
}

export const useLive = create<LiveState>((set) => ({
  revision: '',
  readyItems: 0,
  openTables: 0,
  online: true,
  set: (p) => set(p),
}));

export function useSyncLoop(intervalMs = 4000) {
  const token = useSession((s) => s.token);
  const permsHash = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let appActive = AppState.currentState === 'active';

    const tick = async () => {
      if (!alive) return;
      if (appActive) {
        try {
          const { syncState } = await gql<{ syncState: { revision: string; myReadyItems: number; myOpenTables: number; permissionsHash: string } }>(Q.SYNC);
          const prev = useLive.getState();
          if (syncState.myReadyItems > prev.readyItems) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          useLive.getState().set({ revision: syncState.revision, readyItems: syncState.myReadyItems, openTables: syncState.myOpenTables, online: true });
          // Role/permission change on the POS: reshape the app.
          if (permsHash.current && permsHash.current !== syncState.permissionsHash) useSession.getState().refreshConfig();
          permsHash.current = syncState.permissionsHash;
        } catch (e) {
          if (e instanceof ApiError && e.code === 'NETWORK') useLive.getState().set({ online: false });
        }
      }
      timer = setTimeout(tick, intervalMs);
    };

    const sub = AppState.addEventListener('change', (s) => {
      appActive = s === 'active';
      if (appActive) {
        useSession.getState().refreshConfig();
      }
    });
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [token, intervalMs]);
}

// ------------------------------------------------------------------ queries

/**
 * Fetches on mount, on screen focus, and whenever the live revision changes.
 * Background refetches keep the old data on screen (no spinners mid-service).
 */
export function useQuery<T>(query: string, variables: Record<string, any> = {}, opts: { skip?: boolean; live?: boolean } = {}) {
  const { skip = false, live = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [refreshing, setRefreshing] = useState(false);
  const varsKey = JSON.stringify(variables);
  const revision = useLive((s) => (live ? s.revision : ''));
  const mounted = useRef(true);
  const reqId = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'silent' | 'pull' = 'silent') => {
    if (skip) return;
    const id = ++reqId.current;
    if (mode === 'pull') setRefreshing(true);
    try {
      const res = await gql<T>(query, JSON.parse(varsKey));
      if (mounted.current && id === reqId.current) {
        setData(res);
        setError(null);
      }
    } catch (e: any) {
      if (mounted.current && id === reqId.current) setError(e.message);
    } finally {
      if (mounted.current && id === reqId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [query, varsKey, skip]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Data fetching: state is set when the request resolves, not synchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run('initial');
  }, [run]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (revision) run('silent');
  }, [revision, run]);

  useFocusEffect(
    useCallback(() => {
      run('silent');
    }, [run]),
  );

  return { data, error, loading, refreshing, reload: run, setData };
}

/** Wraps an async action with a busy flag. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}

// ------------------------------------------------------------------ idle lock

let lastActivity = Date.now();
export const touchActivity = () => {
  lastActivity = Date.now();
};

/** Locks back to the PIN screen after the POS-configured idle time, and when the app sat in the background that long. */
export function useIdleLock() {
  const token = useSession((s) => s.token);
  const minutes = useSession((s) => s.config?.capabilities.autoLockMinutes ?? 0);

  useEffect(() => {
    if (!token || !minutes) return;
    touchActivity();
    const limit = minutes * 60000;
    const check = () => {
      if (Date.now() - lastActivity > limit) useSession.getState().lock('Locked after being idle.');
    };
    const id = setInterval(check, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [token, minutes]);
}
