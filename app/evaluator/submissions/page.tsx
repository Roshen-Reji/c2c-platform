"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface Student {
  id: string;
  name: string;
  batch: string;
  submissions: number;
}

export default function EvaluatorSubmissionsPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedPhase, setSelectedPhase] = useState("Phase 1");
  const [selectedDay, setSelectedDay] = useState("Day 1");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Note: We need dynamic phase/day fetching from Firestore here in the future
  const PHASES = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"];
  const DAYS: Record<string, string[]> = {
    "Phase 1": ["Day 1", "Day 2", "Day 3", "Day 4"],
    "Phase 2": ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"],
  };

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "students"), orderBy("fullName"));
        const snapshot = await getDocs(q);
        const loaded: Student[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role && data.role !== "student") return;

          loaded.push({
            id: doc.id,
            name: data.fullName,
            batch: data.batch || "-",
            submissions: data.tasksSubmitted || 0,
          });
        });
        
        // Filter by assigned students if evaluator has an assigned list
        // (Assuming profile.assignedStudents is populated in auth context)
        const assignedIds = profile?.assignedStudents || [];
        const filtered = assignedIds.length > 0 
          ? loaded.filter(s => assignedIds.includes(s.id))
          : loaded;
          
        setStudents(filtered);
      } catch (err) {
        console.warn("Failed to fetch students:", err);
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile]);

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">Student <span className="accent-blue">Submissions</span></h1>
          <p className="portal-page-subtitle">Review submissions and assign points</p>
        </div>
      </div>

      {/* Phase & Day Selectors */}
      <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        <div className="input-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <label className="input-label">Phase</label>
          <select className="input select" value={selectedPhase} onChange={(e) => { setSelectedPhase(e.target.value); setSelectedDay("Day 1"); }}>
            {PHASES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <label className="input-label">Day</label>
          <select className="input select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
            {(DAYS[selectedPhase] || ["Day 1"]).map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Student Dropdowns */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto var(--space-4)" }} />
            Loading assigned students...
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No Students Assigned</div>
            <div className="empty-state-text">You have no students assigned to evaluate yet.</div>
          </div>
        ) : (
          students.map((student) => (
            <div key={student.id} className="card">
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, var(--accent-blue), var(--accent-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-sm)", fontWeight: 900, color: "#0a0a0a" }}>
                    {student.name[0]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>{student.name}</span>
                    <span className="badge badge-primary" style={{ marginLeft: "var(--space-2)", fontSize: "10px" }}>{student.batch}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{student.submissions} submissions</span>
                  <span style={{ transform: expandedStudent === student.id ? "rotate(180deg)" : "rotate(0)", transition: "0.3s" }}>▼</span>
                </div>
              </div>

              {expandedStudent === student.id && (
                <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ padding: "var(--space-4)", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)" }}>
                    <p className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)", textTransform: "uppercase" }}>Task Submission</p>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>No submission for {selectedDay} yet.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <label className="input-label" style={{ marginBottom: 0 }}>Points:</label>
                    <input
                      type="number"
                      className="input"
                      style={{ width: 80 }}
                      min={0}
                      max={100}
                      value={points[student.id] || ""}
                      onChange={(e) => setPoints({ ...points, [student.id]: Number(e.target.value) })}
                    />
                    <button className="btn btn-primary" style={{ padding: "var(--space-2) var(--space-4)" }}>Save Points</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
