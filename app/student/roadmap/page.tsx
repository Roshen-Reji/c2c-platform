"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useScrollCache } from "@/lib/useScrollCache";
import { getDayAccessState, type DayType } from "@/lib/program-types";
import {
  IconClose,
  IconArrowRight,
  IconRoadmap,
  DayTypeIcon,
} from "@/components/SvgIcons";

interface Phase {
  id: string;
  title: string;
  description: string;
  order: number;
  days: Day[];
}

interface Day {
  id: string;
  title: string;
  phaseId?: string;
  type: DayType;
  order: number;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  published: boolean;
  status?: "completed" | "current" | "locked";
}

const TYPE_BADGE: Record<string, string> = {
  learning: "badge-blue",
  task: "badge-green",
  test: "badge-orange",
};

// DEMO_PHASES removed to prevent placeholder flashing and ensure actual data is loaded

export default function RoadmapPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { saveState, loadState } = useScrollCache("c2c-roadmap-state");

  // Restore cached state
  useEffect(() => {
    const cached = loadState();
    if (cached && typeof cached.activePhaseIdx === "number") {
      setActivePhaseIdx(cached.activePhaseIdx);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load phases from Firestore
  useEffect(() => {
    async function loadPhases() {
      try {
        const phasesRef = collection(db, "phases");
        const q = query(phasesRef, orderBy("order"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const loaded: Phase[] = [];
        for (const phaseDoc of snapshot.docs) {
          const phaseData = phaseDoc.data();
          const daysRef = collection(db, "phases", phaseDoc.id, "days");
          const daysQ = query(daysRef, orderBy("order"));
          const daysSnapshot = await getDocs(daysQ);

          const days: Day[] = daysSnapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Day, "id">),
          }));

          loaded.push({
            id: phaseDoc.id,
            title: phaseData.title,
            description: phaseData.description,
            order: phaseData.order,
            days,
          });
        }

        if (loaded.length > 0) {
          setPhases(loaded);
        }
      } catch (err) {
        console.warn("Failed to load phases from Firestore:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPhases();
  }, []);

  const activePhase = phases[activePhaseIdx];
  const numDays = activePhase?.days?.length || 0;

  // Save state on phase change
  const handlePhaseChange = (idx: number) => {
    setActivePhaseIdx(idx);
    saveState({ activePhaseIdx: idx });
  };

  // Generate SVG wavy path
  const generatePath = () => {
    const canvasWidth = Math.max(1000, numDays * 220);
    const startOffsetX = 140;
    const endOffsetX = 140;
    const step = (canvasWidth - startOffsetX - endOffsetX) / (numDays - 1 || 1);
    const centerY = 200;
    const amplitude = isMobile ? 40 : 60;

    let d = `M 0 ${centerY} L ${startOffsetX} ${centerY}`;
    for (let i = 0; i < numDays; i++) {
      const x = i * step + startOffsetX;
      const isTop = i % 2 === 0;
      if (i === 0) {
        d += ` L ${x} ${centerY}`;
      } else {
        const prevX = (i - 1) * step + startOffsetX;
        const cp1X = prevX + step / 2;
        const cp1Y = isTop ? centerY + amplitude : centerY - amplitude;
        const cp2X = prevX + step / 2;
        const cp2Y = isTop ? centerY - amplitude : centerY + amplitude;
        d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x} ${centerY}`;
      }
    }
    return d;
  };

  const canvasWidth = Math.max(1000, numDays * 220);

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">
            Your <span className="accent-yellow">Roadmap</span>
          </h1>
          <p className="portal-page-subtitle">Track your journey across all 5 phases</p>
        </div>
      </div>

      {/* Phase Tabs */}
      <div className="roadmap-phase-tabs">
        {phases.map((phase, i) => (
          <button
            key={phase.id}
            className={`roadmap-phase-tab ${activePhaseIdx === i ? "active" : ""}`}
            onClick={() => handlePhaseChange(i)}
            id={`roadmap-tab-${i}`}
          >
            {isMobile ? `P${i + 1}` : `Phase ${String(i + 1).padStart(2, "0")}`}
          </button>
        ))}
      </div>

      {/* Phase Title */}
      {activePhase ? (
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              marginBottom: "var(--space-2)",
            }}
          >
            {activePhase.title}
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {activePhase.description}
          </p>
        </div>
      ) : null}

      {/* Main Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <div className="spinner" style={{ width: 40, height: 40, marginBottom: "var(--space-4)" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading your roadmap...</p>
        </div>
      ) : phases.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "var(--space-8)" }}>
          <div className="empty-state-icon"><IconRoadmap size={38} /></div>
          <div className="empty-state-title">Roadmap not ready yet</div>
          <div className="empty-state-text">Your learning roadmap is currently being built by the organizers. Please check back later.</div>
        </div>
      ) : (
        <>
          <div className="roadmap-canvas-wrapper">
        <div
          ref={canvasRef}
          className="roadmap-canvas"
          style={{
            height: 400,
            minWidth: canvasWidth,
            padding: isMobile ? "0 20px" : "0 40px",
          }}
        >
          {/* SVG Lines */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
            }}
            preserveAspectRatio="none"
          >
            {/* Background track */}
            <path
              d={generatePath()}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="2"
            />
            {/* Foreground glowing path */}
            <path
              d={generatePath()}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="4"
              style={{ filter: "drop-shadow(0 0 8px rgba(232,255,71,0.6))" }}
              strokeDasharray="2000"
              strokeDashoffset="0"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="2000"
                to="0"
                dur="2s"
                fill="freeze"
                begin="0s"
              />
            </path>
          </svg>

          {/* Nodes and Day Cards */}
          {activePhase.days.map((dayObj, i) => {
            const startOffsetX = 140;
            const endOffsetX = 140;
            const step = (canvasWidth - startOffsetX - endOffsetX) / (numDays - 1 || 1);
            const isTop = i % 2 === 0;
            const xPos = i * step + startOffsetX;
            const yPos = 200;
            const cardLeft = xPos - 120;
            const cardTop = isTop ? yPos - 160 : yPos + 40;
            const access = getDayAccessState(dayObj);
            const status =
              dayObj.status ||
              (access === "open" ? "current" : access === "closed" ? "completed" : "locked");

            const nodeClasses = [
              "roadmap-node",
              status === "completed" ? "completed" : "",
              status === "current" ? "current" : "",
              status === "locked" ? "locked" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={`${activePhaseIdx}-${i}`}>
                {/* Node */}
                <div
                  className={nodeClasses}
                  style={{
                    position: "absolute",
                    left: xPos - 12,
                    top: yPos - 12,
                    width: 24,
                    height: 24,
                  }}
                  onClick={() => {
                    if (status !== "locked") setSelectedDay(dayObj);
                  }}
                />

                {/* Day Card */}
                <div
                  className={`roadmap-day-card ${status === "locked" ? "locked" : ""}`}
                  style={{
                    left: cardLeft,
                    top: cardTop,
                  }}
                  onClick={() => {
                    if (status !== "locked") setSelectedDay(dayObj);
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    <span
                      className="mono-text"
                      style={{
                        fontSize: 12,
                        color: "var(--accent-primary)",
                      }}
                    >
                      Day {dayObj.order}
                    </span>
                    <span className={`badge ${TYPE_BADGE[dayObj.type]}`}>
                      {dayObj.type}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <DayTypeIcon type={dayObj.type} size={16} />
                    <h3
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {dayObj.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {dayObj.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  )}

      {/* Side Panel for selected day */}
      {selectedDay && (
        <>
          <div
            className="side-panel-overlay"
            onClick={() => setSelectedDay(null)}
          />
          <div className="side-panel">
            <div className="side-panel-header">
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {selectedDay.title}
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                  }}
                >
                  <span className={`badge ${TYPE_BADGE[selectedDay.type]}`}>
                    <DayTypeIcon type={selectedDay.type} size={12} />
                    <span style={{ marginLeft: 4 }}>{selectedDay.type}</span>
                  </span>
                  <span
                    className="mono-text"
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Day {selectedDay.order}
                  </span>
                </div>
              </div>
              <button
                className="side-panel-close"
                onClick={() => setSelectedDay(null)}
                aria-label="Close panel"
              >
                <IconClose size={16} />
              </button>
            </div>

            <div className="side-panel-body">
              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  marginBottom: "var(--space-6)",
                }}
              >
                {selectedDay.description}
              </p>

              <div
                style={{
                  background: "var(--surface-glass)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="mono-text"
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        selectedDay.status === "completed"
                          ? "var(--accent-secondary)"
                          : selectedDay.status === "current"
                          ? "var(--accent-primary)"
                          : "var(--text-muted)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      textTransform: "capitalize",
                      color:
                        selectedDay.status === "completed"
                          ? "var(--accent-secondary)"
                          : selectedDay.status === "current"
                          ? "var(--accent-primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {selectedDay.status || "locked"}
                  </span>
                </div>
              </div>
            </div>

            <div className="side-panel-footer">
              <Link
                href={`/student/day/${selectedDay.id}?phaseId=${activePhase.id}`}
                className="btn btn-primary btn-large w-full"
                style={{ justifyContent: "center" }}
              >
                Go to Day
                <IconArrowRight size={16} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
