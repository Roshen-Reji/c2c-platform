"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to cache scroll position and arbitrary state in localStorage.
 * Restores on mount, saves on scroll (debounced).
 */
export function useScrollCache(key: string) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { scrollY } = JSON.parse(cached);
        if (typeof scrollY === "number") {
          // Small delay to let the DOM render first
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
          });
        }
      }
    } catch {
      // Ignore parsing errors
    }

    const handleScroll = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          const existing = localStorage.getItem(key);
          const data = existing ? JSON.parse(existing) : {};
          data.scrollY = window.scrollY;
          localStorage.setItem(key, JSON.stringify(data));
        } catch {
          // Ignore storage errors
        }
      }, 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key]);

  // Save arbitrary state alongside scroll position
  const saveState = useCallback(
    (state: Record<string, unknown>) => {
      try {
        const existing = localStorage.getItem(key);
        const data = existing ? JSON.parse(existing) : {};
        Object.assign(data, state);
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Ignore
      }
    },
    [key]
  );

  // Load arbitrary state
  const loadState = useCallback((): Record<string, unknown> | null => {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, [key]);

  return { saveState, loadState };
}
