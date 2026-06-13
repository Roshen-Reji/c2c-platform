"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Student {
  id: string;
  fullName: string;
  email: string;
  batch: string;
  year: string;
  status: "pending" | "approved" | "rejected";
  paymentScreenshot: string;
  registeredAt: Date;
  role?: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "students"), orderBy("registeredAt", "desc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const loaded: Student[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            fullName: data.fullName,
            email: data.email,
            batch: data.batch,
            year: data.year,
            status: data.status,
            paymentScreenshot: data.paymentScreenshot || "",
            registeredAt: data.registeredAt?.toDate() || new Date(),
            role: data.role || "student",
          };
        });
        // Filter out admins, organisers, and evaluators
        setStudents(loaded.filter(s => s.role === "student"));
      } catch (err) {
        console.warn("Error fetching students:", err);
      }
    }
    load();
  }, []);

  const updateStatus = async (studentId: string, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "students", studentId), { status });
    } catch {
      console.warn("Firestore update failed");
    }
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const removeStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to completely remove this student? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/delete-user?uid=${studentId}&role=student`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        if (data.partial) {
          alert("Student removed from database, but their login credentials could not be deleted from Firebase Auth. Make sure GOOGLE_SERVICE_ACCOUNT_KEY is configured in your .env.local file.");
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove student");
      }
    } catch (err) {
      alert("Error removing student");
    }
  };

  const filtered = students.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.fullName.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return "badge-orange";
      case "approved": return "badge-green";
      case "rejected": return "badge-orange";
      default: return "badge-primary";
    }
  };

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">
            Student <span className="accent-yellow">Management</span>
          </h1>
          <p className="portal-page-subtitle">View, verify, and manage student registrations</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)", flexWrap: "wrap", alignItems: "center" }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <span className="search-bar-icon">🔍</span>
          <input
            className="input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "var(--space-10)" }}
          />
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: "capitalize" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card-label">Total</div>
          <div className="stat-card-value">{students.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pending</div>
          <div className="stat-card-value accent-orange">{students.filter((s) => s.status === "pending").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Approved</div>
          <div className="stat-card-value accent-green">{students.filter((s) => s.status === "approved").length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Branch</th>
              <th>Year</th>
              <th>Status</th>
              <th>Payment</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{s.fullName}</td>
                <td className="mono-text" style={{ fontSize: "var(--text-xs)" }}>{s.email}</td>
                <td><span className="badge badge-primary">{s.batch}</span></td>
                <td style={{ fontSize: "var(--text-xs)" }}>{s.year}</td>
                <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                <td>
                  {s.paymentScreenshot ? (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "var(--text-xs)" }}
                      onClick={() => setViewScreenshot(s.paymentScreenshot)}
                    >
                      🖼️ View
                    </button>
                  ) : (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>No image</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                    {s.status === "pending" && (
                      <>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)" }}
                          onClick={() => updateStatus(s.id, "approved")}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)", borderColor: "var(--accent-tertiary)", color: "var(--accent-tertiary)" }}
                          onClick={() => updateStatus(s.id, "rejected")}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {s.status === "approved" && (
                      <span className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--accent-secondary)" }}>Verified ✓</span>
                    )}
                    {s.status === "rejected" && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: "var(--text-xs)" }}
                        onClick={() => updateStatus(s.id, "approved")}
                      >
                        Re-approve
                      </button>
                    )}
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "var(--text-xs)", color: "var(--accent-tertiary)" }}
                      onClick={() => removeStudent(s.id)}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <div className="empty-state-title">No students found</div>
                    <div className="empty-state-text">Try adjusting your search or filter.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Screenshot Modal */}
      {viewScreenshot && (
        <div className="modal-overlay" onClick={() => setViewScreenshot(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Payment Screenshot</h3>
              <button className="modal-close" onClick={() => setViewScreenshot(null)}>✕</button>
            </div>
            {viewScreenshot.startsWith("http") ? (
              <>
                {viewScreenshot.includes("drive.google.com") ? (
                  <iframe
                    src={viewScreenshot.replace(/\/view.*/, "/preview")}
                    title="Payment screenshot"
                    style={{ width: "100%", height: "400px", border: "none", borderRadius: "var(--radius-lg)" }}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={viewScreenshot}
                    alt="Payment screenshot"
                    style={{ width: "100%", borderRadius: "var(--radius-lg)" }}
                  />
                )}
                <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
                  <a href={viewScreenshot} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Open in new tab
                  </a>
                </div>
              </>
            ) : (
              <div style={{ padding: "var(--space-8)", textAlign: "center", background: "var(--surface-glass)", borderRadius: "var(--radius-lg)" }}>
                <span style={{ fontSize: "2rem" }}>⚠️</span>
                <p style={{ marginTop: "var(--space-4)", color: "var(--text-secondary)" }}>
                  {viewScreenshot}
                </p>
                <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  The Google Drive storage integration was not properly configured when this student registered.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
