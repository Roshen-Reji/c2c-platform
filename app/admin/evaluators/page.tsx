"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Evaluator {
  id: string;
  name: string;
  email: string;
  assignedStudents: string[];
}

export default function AdminEvaluatorsPage() {
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedEvaluator, setSelectedEvaluator] = useState<Evaluator | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "evaluators"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        setEvaluators(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.fullName || data.name,
              email: data.email,
              assignedStudents: data.assignedStudents || [],
            };
          })
        );
      } catch {
        // Demo mode
      }
    }
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) return;
    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role: "evaluator" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Failed to create evaluator", type: "error" });
        return;
      }

      setEvaluators((prev) => [
        { id: data.userId, name: name.trim(), email: email.trim(), assignedStudents: [] },
        ...prev,
      ]);

      const tempMsg = data.tempPassword
        ? `Evaluator created! Temp password: ${data.tempPassword}`
        : "Evaluator created successfully!";
      setMessage({ text: tempMsg, type: "success" });
      setName("");
      setEmail("");
      setShowCreate(false);
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
            Evaluator <span className="accent-blue">Management</span>
          </h1>
          <p className="portal-page-subtitle">Manage volunteers who monitor and evaluate students</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add Evaluator
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
            wordBreak: "break-all",
          }}
        >
          {message.text}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card-label">📊 Total Evaluators</div>
          <div className="stat-card-value accent-blue">{evaluators.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">👥 With Students</div>
          <div className="stat-card-value accent-green">{evaluators.filter((e) => e.assignedStudents.length > 0).length}</div>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Students</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {evaluators.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">No evaluators yet</div>
                    <div className="empty-state-text">Click &quot;Add Evaluator&quot; to create volunteer accounts.</div>
                  </div>
                </td>
              </tr>
            ) : (
              evaluators.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{e.name}</td>
                  <td className="mono-text" style={{ fontSize: "var(--text-xs)" }}>{e.email}</td>
                  <td>
                    {e.assignedStudents.length > 0 ? (
                      <span className="badge badge-green" style={{ fontSize: "10px" }}>{e.assignedStudents.length} students</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>None</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setSelectedEvaluator(e)}>View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Evaluator</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter evaluator name" />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="evaluator@email.com" />
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-4)" }}>
              A Firebase Auth account will be created. A temporary password will be generated.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <><span className="spinner" /> Creating...</>
                ) : (
                  "Create Evaluator"
                )}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel for Evaluator Details */}
      {selectedEvaluator && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedEvaluator(null)} />
          <div className="side-panel">
            <div className="side-panel-header">
              <h3 className="modal-title">Evaluator Details</h3>
              <button className="side-panel-close" onClick={() => setSelectedEvaluator(null)}>✕</button>
            </div>
            <div className="roadmap-phase-tabs" style={{ marginBottom: 0, padding: "var(--space-4)", borderBottom: "1px solid var(--border-subtle)" }}>
              <div 
                className={`roadmap-phase-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Profile Info
              </div>
              <div 
                className={`roadmap-phase-tab ${activeTab === 'assignments' ? 'active' : ''}`}
                onClick={() => setActiveTab('assignments')}
              >
                Assigned Students
              </div>
            </div>
            <div className="side-panel-body">
              {activeTab === 'details' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                    <div className="sidebar-avatar" style={{ width: "64px", height: "64px", fontSize: "24px" }}>
                      {selectedEvaluator.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--font-heading)", marginBottom: "var(--space-1)" }}>{selectedEvaluator.name}</h2>
                      <div className="mono-text" style={{ color: "var(--text-secondary)" }}>{selectedEvaluator.email}</div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <h4 style={{ fontFamily: "var(--font-heading)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>Account Status</h4>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <span className="badge badge-green">Active</span>
                      <span className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>ID: {selectedEvaluator.id}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'assignments' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontFamily: "var(--font-heading)" }}>Assigned Students</h3>
                    <button className="btn btn-secondary" style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-xs)" }}>
                      + Assign Student
                    </button>
                  </div>
                  
                  {selectedEvaluator.assignedStudents.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                      <div style={{ fontSize: "32px", marginBottom: "var(--space-4)" }}>🎓</div>
                      <h4 style={{ marginBottom: "var(--space-2)" }}>No assignments yet</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>This evaluator hasn't been assigned to any students.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {selectedEvaluator.assignedStudents.map(studentId => (
                        <div key={studentId} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                            <span className="badge badge-blue">Student</span>
                            <span className="mono-text" style={{ fontSize: "var(--text-xs)" }}>ID: {studentId}</span>
                          </div>
                          <button className="btn btn-ghost" style={{ color: "var(--accent-orange)" }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
