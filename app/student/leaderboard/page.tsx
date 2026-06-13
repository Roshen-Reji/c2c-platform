"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { authenticatedJson } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLeaderboardCache } from "@/lib/useLeaderboardCache";
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconGoldMedal,
  IconSilverMedal,
  IconBronzeMedal,
  IconClock,
} from "@/components/SvgIcons";

interface LeaderboardEntry {
  id: string;
  fullName: string;
  batch: string;
  totalPoints: number;
  tasksSubmitted: number;
  tasksApproved: number;
  earliestSubmission?: number;
}

const ITEMS_PER_PAGE = 20;

// Tie-breaker sort: points → approval rate → earliest submission → alphabetical
function sortWithTieBreaker(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Higher points first
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // 2. Higher approval rate
    const rateA = a.tasksSubmitted > 0 ? a.tasksApproved / a.tasksSubmitted : 0;
    const rateB = b.tasksSubmitted > 0 ? b.tasksApproved / b.tasksSubmitted : 0;
    if (rateB !== rateA) return rateB - rateA;
    // 3. Earlier submission
    const timeA = a.earliestSubmission || Infinity;
    const timeB = b.earliestSubmission || Infinity;
    if (timeA !== timeB) return timeA - timeB;
    // 4. Alphabetical
    return a.fullName.localeCompare(b.fullName);
  });
}

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Fetch function for the cache hook
  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    try {
      const result = await authenticatedJson<{ entries: LeaderboardEntry[] }>("/api/leaderboard");
      return sortWithTieBreaker(result.entries);
    } catch {
      return [];
    }
  }, []);

  const {
    data: entries,
    isStale,
    isLoading,
    refresh,
    lastUpdated,
  } = useLeaderboardCache(fetchLeaderboard, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const filtered = debouncedSearch
    ? entries.filter((e) =>
        e.fullName.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : entries;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        setCurrentPage((p) => p + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <IconGoldMedal size={28} />;
    if (rank === 2) return <IconSilverMedal size={28} />;
    if (rank === 3) return <IconBronzeMedal size={28} />;
    return null;
  };

  // Generate smart pagination buttons
  const getPaginationButtons = () => {
    const buttons: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else {
      buttons.push(1);
      if (currentPage > 3) buttons.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) buttons.push(i);
      if (currentPage < totalPages - 2) buttons.push("ellipsis");
      buttons.push(totalPages);
    }
    return buttons;
  };

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">
            Leader<span className="accent-yellow">board</span>
          </h1>
          <p className="portal-page-subtitle">
            See how you rank against fellow participants
          </p>
        </div>
        {/* Cache status */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {isStale && (
            <button className="leaderboard-stale-badge" onClick={refresh}>
              <IconClock size={12} />
              Stale — Click to refresh
            </button>
          )}
          {lastUpdated && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="leaderboard-count">
        Showing {paginated.length} of {filtered.length} participants
        {debouncedSearch && ` matching "${debouncedSearch}"`}
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-bar-icon">
          <IconSearch size={16} />
        </span>
        <input
          className="input"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="leaderboard-search"
          style={{ paddingLeft: "var(--space-10)" }}
        />
      </div>

      {/* Loading state */}
      {isLoading && entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <div className="spinner" style={{ width: 32, height: 32, marginBottom: "var(--space-4)" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Loading leaderboard...</p>
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Rank</th>
              <th>Name</th>
              <th>Branch</th>
              <th style={{ textAlign: "right" }}>Tasks</th>
              <th style={{ textAlign: "right" }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((entry, i) => {
              const rank = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
              const isCurrentUser = profile?.uid === entry.id;
              const isTop3 = rank <= 3;

              const rowClasses = [
                isCurrentUser ? "leaderboard-row-highlight" : "",
                isTop3 ? `leaderboard-row-top3 rank-${rank}` : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <tr key={entry.id} className={rowClasses}>
                  <td>
                    <div className="leaderboard-medal">
                      {getMedalIcon(rank) || (
                        <span
                          className="leaderboard-rank"
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          #{rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: isCurrentUser ? 600 : 400,
                        color: isCurrentUser
                          ? "var(--accent-primary)"
                          : "var(--text-primary)",
                      }}
                    >
                      {entry.fullName}
                      {isCurrentUser && (
                        <span
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--accent-primary)",
                            marginLeft: "var(--space-2)",
                          }}
                        >
                          (You)
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge badge-primary"
                      style={{ fontSize: "10px" }}
                    >
                      {entry.batch}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      className="mono-text"
                      style={{ fontSize: "var(--text-sm)" }}
                    >
                      {entry.tasksSubmitted}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      className="mono-text"
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 700,
                        color: "var(--accent-primary)",
                      }}
                    >
                      {entry.totalPoints}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <IconChevronLeft size={14} />
            </button>
            {getPaginationButtons().map((item, i) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${i}`}
                  style={{
                    color: "var(--text-muted)",
                    padding: "0 var(--space-2)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  className={`pagination-btn ${currentPage === item ? "active" : ""}`}
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </button>
              )
            )}
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
