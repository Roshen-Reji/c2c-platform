"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CACHE_KEY = "c2c-leaderboard-cache";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Stale-while-revalidate leaderboard cache.
 * Returns cached data immediately if fresh, fetches in background if stale.
 */
export function useLeaderboardCache<T>(
  fetcher: () => Promise<T>,
  fallback: T
): {
  data: T;
  isStale: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
} {
  const [data, setData] = useState<T>(fallback);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Load from cache on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const entry: CacheEntry<T> = JSON.parse(raw);
        const age = Date.now() - entry.timestamp;
        setData(entry.data);
        setLastUpdated(new Date(entry.timestamp));
        setIsStale(age > CACHE_TTL_MS);

        if (age < CACHE_TTL_MS) {
          setIsLoading(false);
          // Still refresh in background
          fetcherRef.current().then((fresh) => {
            setData(fresh);
            setIsStale(false);
            setLastUpdated(new Date());
            const newEntry: CacheEntry<T> = { data: fresh, timestamp: Date.now() };
            localStorage.setItem(CACHE_KEY, JSON.stringify(newEntry));
          }).catch(() => {
            // Keep cached data
          });
          return;
        }
      }
    } catch {
      // No cache or parse error
    }

    // No valid cache — fetch fresh
    fetcherRef.current()
      .then((fresh) => {
        setData(fresh);
        setIsStale(false);
        setLastUpdated(new Date());
        const entry: CacheEntry<T> = { data: fresh, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
      })
      .catch(() => {
        // Keep fallback
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setIsStale(false);
      setLastUpdated(new Date());
      const entry: CacheEntry<T> = { data: fresh, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Keep current data
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isStale, isLoading, refresh, lastUpdated };
}
