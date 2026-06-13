"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  type: "learning" | "task" | "test";
  order: number;
  description: string;
  meetLink?: string;
  meetTime?: string;
}

const TYPE_COLORS: Record<string, string> = {
  learning: "badge-blue",
  task: "badge-green",
  test: "badge-orange",
};

export default function AdminPhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [showCreatePhase, setShowCreatePhase] = useState(false);
  const [showCreateDay, setShowCreateDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Create phase form
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newPhaseDesc, setNewPhaseDesc] = useState("");

  // Create day form
  const [newDayTitle, setNewDayTitle] = useState("");
  const [newDayType, setNewDayType] = useState<"learning" | "task" | "test">("learning");
  const [newDayDesc, setNewDayDesc] = useState("");
  const [newDayMeetLink, setNewDayMeetLink] = useState("");
  const [newDayMeetTime, setNewDayMeetTime] = useState("");

  // Load phases from Firestore
  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "phases"), orderBy("order"));
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

        setPhases(loaded);
        if (loaded.length > 0) setExpandedPhase(loaded[0].id);
      } catch {
        // Demo mode - no data
      }
    }
    load();
  }, []);

  const handleCreatePhase = async () => {
    if (!newPhaseTitle.trim()) return;
    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/create-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPhaseTitle.trim(),
          description: newPhaseDesc.trim(),
          order: phases.length + 1,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Failed to create phase", type: "error" });
        return;
      }

      const newPhase: Phase = {
        id: data.phaseId,
        title: newPhaseTitle.trim(),
        description: newPhaseDesc.trim(),
        order: phases.length + 1,
        days: [],
      };
      setPhases([...phases, newPhase]);
      setExpandedPhase(newPhase.id);
      setNewPhaseTitle("");
      setNewPhaseDesc("");
      setShowCreatePhase(false);
      setMessage({ text: "Phase created successfully!", type: "success" });
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDay = async (phaseId: string) => {
    if (!newDayTitle.trim()) return;
    setCreating(true);
    setMessage(null);

    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    try {
      const res = await fetch("/api/admin/create-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          title: newDayTitle.trim(),
          type: newDayType,
          description: newDayDesc.trim(),
          order: phase.days.length + 1,
          meetLink: newDayMeetLink.trim() || undefined,
          meetTime: newDayMeetTime.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Failed to create day", type: "error" });
        return;
      }

      const newDay: Day = {
        id: data.dayId,
        title: newDayTitle.trim(),
        type: newDayType,
        order: phase.days.length + 1,
        description: newDayDesc.trim(),
        meetLink: newDayMeetLink.trim() || undefined,
        meetTime: newDayMeetTime.trim() || undefined,
      };

      setPhases(phases.map((p) => (p.id === phaseId ? { ...p, days: [...p.days, newDay] } : p)));
      setNewDayTitle("");
      setNewDayType("learning");
      setNewDayDesc("");
      setNewDayMeetLink("");
      setNewDayMeetTime("");
      setShowCreateDay(null);
      setMessage({ text: "Day added successfully!", type: "success" });
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">
            Phases & <span className="accent-yellow">Days</span>
          </h1>
          <p className="portal-page-subtitle">Design and manage the program structure</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreatePhase(true)}>
          + Create Phase
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "var(--space-3) var(--space-5)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-6)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            background: message.type === "success" ? "rgba(71, 255, 167, 0.1)" : "rgba(255, 107, 71, 0.1)",
            border: `1px solid ${message.type === "success" ? "rgba(71, 255, 167, 0.3)" : "rgba(255, 107, 71, 0.3)"}`,
            color: message.type === "success" ? "var(--accent-secondary)" : "var(--accent-tertiary)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card-label">📋 Total Phases</div>
          <div className="stat-card-value accent-primary">{phases.length}</div>
          <div className="stat-card-sub">of 5</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">📅 Total Days</div>
          <div className="stat-card-value accent-blue">{phases.reduce((s, p) => s + p.days.length, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">📚 Learning</div>
          <div className="stat-card-value accent-blue">{phases.reduce((s, p) => s + p.days.filter((d) => d.type === "learning").length, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">📝 Tests</div>
          <div className="stat-card-value accent-orange">{phases.reduce((s, p) => s + p.days.filter((d) => d.type === "test").length, 0)}</div>
        </div>
      </div>

      {/* Phases */}
      {phases.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No phases configured</div>
            <div className="empty-state-text">Click &quot;Create Phase&quot; to start building your program structure.</div>
          </div>
        </div>
      ) : (
        phases.map((phase) => {
          const isExpanded = expandedPhase === phase.id;
          return (
            <div key={phase.id} className="card" style={{ marginBottom: "var(--space-4)", overflow: "hidden" }}>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "var(--radius-full)",
                      background: isExpanded ? "var(--accent-primary)" : "var(--bg-secondary)",
                      color: isExpanded ? "#0a0a0a" : "var(--text-tertiary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "var(--text-sm)",
                      transition: "all 0.3s", flexShrink: 0,
                    }}
                  >
                    {String(phase.order).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)" }}>{phase.title}</h3>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                      {phase.description} • {phase.days.length} days
                    </p>
                  </div>
                </div>
                <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "0.3s" }}>▼</span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
                  {phase.days.length === 0 ? (
                    <div className="empty-state" style={{ padding: "var(--space-8)" }}>
                      <div className="empty-state-icon">📅</div>
                      <div className="empty-state-title">No days yet</div>
                      <div className="empty-state-text">Add days to this phase to build your program.</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {phase.days.map((day) => (
                        <div
                          key={day.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "var(--space-3) var(--space-4)", background: "var(--bg-secondary)",
                            borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                            <span className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", minWidth: 40 }}>D{day.order}</span>
                            <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{day.title}</span>
                            <span className={`badge ${TYPE_COLORS[day.type]}`}>{day.type}</span>
                          </div>
                          <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            {day.meetLink && <span className="badge badge-green" style={{ fontSize: "9px" }}>Meet ✓</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-secondary" style={{ marginTop: "var(--space-4)" }} onClick={() => setShowCreateDay(phase.id)}>
                    + Add Day
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Create Phase Modal */}
      {showCreatePhase && (
        <div className="modal-overlay" onClick={() => setShowCreatePhase(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Phase</h3>
              <button className="modal-close" onClick={() => setShowCreatePhase(false)}>✕</button>
            </div>
            <div className="input-group">
              <label className="input-label">Phase Title</label>
              <input className="input" placeholder="e.g., Technical Skill Building" value={newPhaseTitle} onChange={(e) => setNewPhaseTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={3} placeholder="Brief description of this phase" value={newPhaseDesc} onChange={(e) => setNewPhaseDesc(e.target.value)} style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-primary" onClick={handleCreatePhase} disabled={creating}>
                {creating ? <><span className="spinner" /> Creating...</> : "Create Phase"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCreatePhase(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Day Modal */}
      {showCreateDay && (
        <div className="modal-overlay" onClick={() => setShowCreateDay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Day</h3>
              <button className="modal-close" onClick={() => setShowCreateDay(null)}>✕</button>
            </div>
            <div className="input-group">
              <label className="input-label">Day Title</label>
              <input className="input" placeholder="e.g., DSA Fundamentals" value={newDayTitle} onChange={(e) => setNewDayTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Day Type</label>
              <select className="input select" value={newDayType} onChange={(e) => setNewDayType(e.target.value as "learning" | "task" | "test")}>
                <option value="learning">📚 Learning Session</option>
                <option value="task">✏️ Task / Assignment</option>
                <option value="test">📝 Test / Assessment</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={2} placeholder="What happens on this day" value={newDayDesc} onChange={(e) => setNewDayDesc(e.target.value)} style={{ resize: "vertical" }} />
            </div>
            {newDayType === "learning" && (
              <>
                <div className="input-group">
                  <label className="input-label">Google Meet Link</label>
                  <input className="input" placeholder="https://meet.google.com/..." value={newDayMeetLink} onChange={(e) => setNewDayMeetLink(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Session Time</label>
                  <input className="input" placeholder="e.g., 10:00 AM - 11:30 AM IST" value={newDayMeetTime} onChange={(e) => setNewDayMeetTime(e.target.value)} />
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-primary" onClick={() => handleCreateDay(showCreateDay)} disabled={creating}>
                {creating ? <><span className="spinner" /> Adding...</> : "Add Day"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCreateDay(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
