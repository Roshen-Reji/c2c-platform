"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Organiser {
  id: string;
  name: string;
  email: string;
  assignedDays: string[];
}

export default function AdminOrganisersPage() {
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedOrganiser, setSelectedOrganiser] = useState<Organiser | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "organisers"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        setOrganisers(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.fullName || data.name,
              email: data.email,
              assignedDays: data.assignedDays || [],
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
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role: "organiser" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Failed to create organiser", type: "error" });
        return;
      }

      setOrganisers((prev) => [
        { id: data.userId, name: name.trim(), email: email.trim(), assignedDays: [] },
        ...prev,
      ]);

      const tempMsg = data.tempPassword
        ? `Organiser created! Temp password: ${data.tempPassword}`
        : "Organiser created successfully!";
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
            Organiser <span className="accent-purple">Management</span>
          </h1>
          <p className="portal-page-subtitle">Manage speakers and session organisers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add Organiser
        </button>
      </div>

      {/* Message */}
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
          <div className="stat-card-label">🎤 Total Organisers</div>
          <div className="stat-card-value accent-purple">{organisers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">📅 With Assignments</div>
          <div className="stat-card-value accent-green">{organisers.filter((o) => o.assignedDays.length > 0).length}</div>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Days</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organisers.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎤</div>
                    <div className="empty-state-title">No organisers yet</div>
                    <div className="empty-state-text">Click &quot;Add Organiser&quot; to create speaker accounts.</div>
                  </div>
                </td>
              </tr>
            ) : (
              organisers.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{o.name}</td>
                  <td className="mono-text" style={{ fontSize: "var(--text-xs)" }}>{o.email}</td>
                  <td>
                    {o.assignedDays.length > 0 ? (
                      o.assignedDays.map((d) => (
                        <span key={d} className="badge badge-blue" style={{ marginRight: 4, fontSize: "10px" }}>
                          {d}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>None assigned</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setSelectedOrganiser(o)}>View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Organiser</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter organiser name" />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="organiser@email.com" />
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-4)" }}>
              A Firebase Auth account will be created. A temporary password will be generated.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <><span className="spinner" /> Creating...</>
                ) : (
                  "Create Organiser"
                )}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel for Organiser Details */}
      {selectedOrganiser && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedOrganiser(null)} />
          <div className="side-panel">
            <div className="side-panel-header">
              <h3 className="modal-title">Organiser Details</h3>
              <button className="side-panel-close" onClick={() => setSelectedOrganiser(null)}>✕</button>
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
                Assignments
              </div>
            </div>
            <div className="side-panel-body">
              {activeTab === 'details' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                    <div className="sidebar-avatar" style={{ width: "64px", height: "64px", fontSize: "24px" }}>
                      {selectedOrganiser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--font-heading)", marginBottom: "var(--space-1)" }}>{selectedOrganiser.name}</h2>
                      <div className="mono-text" style={{ color: "var(--text-secondary)" }}>{selectedOrganiser.email}</div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <h4 style={{ fontFamily: "var(--font-heading)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>Account Status</h4>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <span className="badge badge-green">Active</span>
                      <span className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>ID: {selectedOrganiser.id}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'assignments' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontFamily: "var(--font-heading)" }}>Assigned Days</h3>
                    <button className="btn btn-secondary" style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-xs)" }}>
                      + Assign Day
                    </button>
                  </div>
                  
                  {selectedOrganiser.assignedDays.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                      <div style={{ fontSize: "32px", marginBottom: "var(--space-4)" }}>📅</div>
                      <h4 style={{ marginBottom: "var(--space-2)" }}>No assignments yet</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>This organiser hasn't been assigned to any days.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {selectedOrganiser.assignedDays.map(day => (
                        <div key={day} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                            <span className="badge badge-blue">Day</span>
                            <span style={{ fontWeight: 600 }}>{day}</span>
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
