"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { updatePassword, type User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import {
  IconEdit,
  IconLock,
  IconDownload,
  IconSignOut,
  IconCheckCircle,
  IconFileText,
  IconUnlock,
  IconActivity,
  DayTypeIcon,
} from "@/components/SvgIcons";

// ─── Phase/Day structure for 24-day heatmap ─────────────────
const PROGRAM_DAYS = [
  {
    phase: "Phase 1 — Foundation",
    days: [
      { id: "d1", name: "Introduction & Domain", order: 1 },
      { id: "d2", name: "Resume Workshop", order: 2 },
      { id: "d3", name: "Resume Submission", order: 3 },
      { id: "d4", name: "Self-Intro Recording", order: 4 },
    ],
  },
  {
    phase: "Phase 2 — Aptitude",
    days: [
      { id: "d5", name: "Aptitude Fundamentals", order: 5 },
      { id: "d6", name: "Self-Learning", order: 6 },
      { id: "d7", name: "Question Submission", order: 7 },
      { id: "d8", name: "Aptitude Test", order: 8 },
    ],
  },
  {
    phase: "Phase 3 — Technical",
    days: [
      { id: "d9", name: "Core Subject Prep", order: 9 },
      { id: "d10", name: "DSA Training", order: 10 },
      { id: "d11", name: "Tech Questions", order: 11 },
      { id: "d12", name: "Technical Test", order: 12 },
    ],
  },
  {
    phase: "Phase 4 — Professional",
    days: [
      { id: "d13", name: "Communication & GD", order: 13 },
      { id: "d14", name: "Daily Practice", order: 14 },
      { id: "d15", name: "Speaking Submission", order: 15 },
      { id: "d16", name: "LinkedIn Optimization", order: 16 },
      { id: "d17", name: "Comm Assessment", order: 17 },
    ],
  },
  {
    phase: "Phase 5 — Final",
    days: [
      { id: "d18", name: "Application Strategies", order: 18 },
      { id: "d19", name: "Final CV Submission", order: 19 },
      { id: "d20", name: "Mini-Project", order: 20 },
      { id: "d21", name: "Technical Interview", order: 21 },
      { id: "d22", name: "HR Interview", order: 22 },
      { id: "d23", name: "Apply for Roles", order: 23 },
      { id: "d24", name: "Closing Session", order: 24 },
    ],
  },
];

// Remove demo data - system will now rely on actual student data when implemented
const HEATMAP_DATA: Record<string, number> = {};
const POINT_BREAKDOWN: { phase: string; day: string; type: string; earned: number; max: number }[] = [];
const RECENT_ACTIVITY: { type: string; message: string; time: string }[] = [];

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.fullName || "");
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleNameUpdate = async () => {
    if (!newName.trim() || !profile) return;
    try {
      await updateDoc(doc(db, "students", profile.uid), {
        fullName: newName.trim(),
      });
      setEditingName(false);
      showMessage("Name updated successfully!", "success");
    } catch {
      showMessage("Failed to update name. Please try again.", "error");
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      showMessage("Password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage("Passwords do not match.", "error");
      return;
    }
    try {
      await updatePassword(auth.currentUser as User, newPassword);
      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      showMessage("Password changed successfully!", "success");
    } catch {
      showMessage("Failed to change password. You may need to re-login.", "error");
    }
  };

  const totalEarned = POINT_BREAKDOWN.reduce((s, r) => s + r.earned, 0);
  const totalMax = POINT_BREAKDOWN.reduce((s, r) => s + r.max, 0);
  const completionPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const canExport = completionPct >= 80;

  // PDF Export with jspdf
  const handleExportPDF = useCallback(async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();

      // Title
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("C2C — Campus 2 Corporate", 20, 25);

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text("Student Progress Report", 20, 35);

      // Student Info
      pdf.setFontSize(11);
      pdf.setDrawColor(200);
      pdf.line(20, 42, 190, 42);

      pdf.setFont("helvetica", "bold");
      pdf.text("Name:", 20, 52);
      pdf.setFont("helvetica", "normal");
      pdf.text(profile?.fullName || "Student", 50, 52);

      pdf.setFont("helvetica", "bold");
      pdf.text("Email:", 20, 60);
      pdf.setFont("helvetica", "normal");
      pdf.text(profile?.email || "", 50, 60);

      pdf.setFont("helvetica", "bold");
      pdf.text("Batch:", 20, 68);
      pdf.setFont("helvetica", "normal");
      pdf.text(profile?.batch || "—", 50, 68);

      pdf.setFont("helvetica", "bold");
      pdf.text("Total Points:", 20, 76);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${totalEarned} / ${totalMax} (${completionPct}%)`, 60, 76);

      pdf.line(20, 82, 190, 82);

      // Point Breakdown Table
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("Point Breakdown", 20, 92);

      const tableStartY = 100;
      // Header
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, tableStartY - 5, 170, 8, "F");
      pdf.text("Phase", 22, tableStartY);
      pdf.text("Day", 55, tableStartY);
      pdf.text("Earned", 135, tableStartY);
      pdf.text("Max", 155, tableStartY);
      pdf.text("%", 175, tableStartY);

      // Rows
      pdf.setFont("helvetica", "normal");
      POINT_BREAKDOWN.forEach((row, i) => {
        const y = tableStartY + 10 + i * 8;
        pdf.text(row.phase, 22, y);
        pdf.text(row.day, 55, y);
        pdf.text(String(row.earned), 138, y);
        pdf.text(String(row.max), 158, y);
        pdf.text(`${Math.round((row.earned / row.max) * 100)}%`, 175, y);
      });

      // Footer
      const footerY = tableStartY + 10 + POINT_BREAKDOWN.length * 8 + 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128);
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()} | C2C Platform`,
        20,
        footerY
      );

      pdf.save(`C2C_Progress_${profile?.fullName?.replace(/\s/g, "_") || "Student"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      showMessage("Failed to generate PDF. Please try again.", "error");
    }
  }, [profile, totalEarned, totalMax, completionPct]);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    await logout();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "approved":
        return <IconCheckCircle size={16} color="var(--accent-secondary)" />;
      case "test":
        return <IconFileText size={16} color="var(--accent-tertiary)" />;
      case "phase_unlock":
        return <IconUnlock size={16} color="var(--accent-purple)" />;
      default:
        return <IconActivity size={16} color="var(--accent-primary)" />;
    }
  };

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">
            Your <span className="accent-yellow">Profile</span>
          </h1>
          <p className="portal-page-subtitle">
            Manage your account and view your progress
          </p>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`toast ${messageType === "success" ? "toast-success" : "toast-error"}`}>
          {message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-6)",
        }}
      >
        {/* ─── Profile Card ────────────────────────── */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-6)",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "var(--radius-full)",
                background:
                  "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: 900,
                color: "#0a0a0a",
                flexShrink: 0,
              }}
            >
              {profile?.fullName
                ? profile.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "?"}
            </div>
            <div style={{ flex: 1 }}>
              {editingName ? (
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    alignItems: "center",
                  }}
                >
                  <input
                    className="input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ maxWidth: 300 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleNameUpdate}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setEditingName(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "var(--text-2xl)",
                      fontWeight: 700,
                    }}
                  >
                    {profile?.fullName || "Student"}
                  </h2>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "var(--text-xs)" }}
                    onClick={() => {
                      setNewName(profile?.fullName || "");
                      setEditingName(true);
                    }}
                  >
                    <IconEdit size={14} /> Edit
                  </button>
                </div>
              )}
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {profile?.email}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-2)",
                }}
              >
                <span className="badge badge-primary">
                  {profile?.batch || "—"}
                </span>
                <span className="badge badge-blue">
                  {profile?.year || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Change Password ─────────────────────── */}
        <div className="card">
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-lg)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <IconLock size={18} /> Change Password
          </h3>
          {changingPassword ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <button
                  className="btn btn-primary"
                  onClick={handlePasswordChange}
                >
                  Update Password
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setChangingPassword(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setChangingPassword(true)}
            >
              <IconLock size={14} /> Change Password
            </button>
          )}
        </div>

        {/* ─── Recent Activity ─────────────────────── */}
        <div className="card">
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-lg)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <IconActivity size={18} /> Recent Activity
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
            }}
          >
            {RECENT_ACTIVITY.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                No recent activity to show.
              </div>
            ) : (
              RECENT_ACTIVITY.map((act, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "var(--surface-glass)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {getActivityIcon(act.type)}
                  <span
                    style={{
                      flex: 1,
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {act.message}
                  </span>
                  <span
                    className="mono-text"
                    style={{ fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    {act.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Activity Heatmap (24 days) ──────────── */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-lg)",
              marginBottom: "var(--space-4)",
            }}
          >
            Activity Heatmap
          </h3>
          <div className="heatmap-container">
            {PROGRAM_DAYS.map((group) => (
              <div key={group.phase} className="heatmap-phase-group">
                <div className="heatmap-phase-label">{group.phase}</div>
                <div className="heatmap-row">
                  {group.days.map((day) => {
                    const level = HEATMAP_DATA[day.id] || 0;
                    return (
                      <div
                        key={day.id}
                        className={`heatmap-cell ${
                          level > 0 ? `level-${level}` : ""
                        }`}
                        onMouseEnter={() => setHoveredCell(day.id)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{ position: "relative" }}
                      >
                        {hoveredCell === day.id && (
                          <div className="heatmap-tooltip">
                            Day {day.order}: {day.name}
                            <br />
                            Activity Level: {level}/4
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="heatmap-legend">
              <span className="heatmap-legend-label">Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  className={`heatmap-legend-cell ${
                    l > 0 ? `level-${l}` : ""
                  }`}
                  style={{
                    background:
                      l === 0
                        ? "var(--bg-secondary)"
                        : undefined,
                  }}
                />
              ))}
              <span className="heatmap-legend-label">More</span>
            </div>
          </div>
        </div>

        {/* ─── Point Breakdown ─────────────────────── */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-4)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-lg)",
              }}
            >
              Point Breakdown
            </h3>
            {/* PDF Export Button */}
            <button
              className={`btn ${canExport ? "btn-secondary" : "btn-ghost"}`}
              onClick={canExport ? handleExportPDF : undefined}
              disabled={!canExport}
              style={{
                opacity: canExport ? 1 : 0.4,
                cursor: canExport ? "pointer" : "not-allowed",
              }}
              title={
                canExport
                  ? "Download your progress report"
                  : "Available at 80% completion"
              }
            >
              <IconDownload size={14} />
              {canExport ? "Download Report" : "Available at 80%"}
            </button>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Day</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Earned</th>
                  <th style={{ textAlign: "right" }}>Max</th>
                  <th style={{ width: 120 }}>Progress</th>
                  <th style={{ textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {POINT_BREAKDOWN.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
                      No points earned yet. Start completing tasks!
                    </td>
                  </tr>
                ) : (
                  POINT_BREAKDOWN.map((row, i) => {
                    const pct = Math.round((row.earned / row.max) * 100);
                    const barColor =
                      row.type === "test"
                        ? "var(--accent-purple)"
                        : "var(--accent-secondary)";
                    const pctColor =
                      pct >= 80
                        ? "var(--accent-secondary)"
                        : pct >= 50
                        ? "var(--accent-primary)"
                        : "var(--accent-tertiary)";
                    return (
                      <tr key={i}>
                        <td>
                          <span
                            className="badge badge-primary"
                            style={{ fontSize: "10px" }}
                          >
                            {row.phase}
                          </span>
                        </td>
                        <td>{row.day}</td>
                        <td>
                          <DayTypeIcon type={row.type} size={14} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="mono-text accent-green">
                            {row.earned}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className="mono-text"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {row.max}
                          </span>
                        </td>
                        <td>
                          <div className="point-bar-wrapper">
                            <div className="point-bar-track">
                              <div
                                className="point-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: barColor,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className="mono-text"
                            style={{ color: pctColor }}
                          >
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "var(--space-4) var(--space-5)",
                borderTop: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Total</span>
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                }}
              >
                {totalEarned} / {totalMax} ({completionPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* ─── Sign Out ────────────────────────────── */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <button className="btn-signout" onClick={() => setShowSignOutConfirm(true)}>
            <IconSignOut size={16} color="var(--accent-tertiary)" />
            Sign Out of Account
          </button>
        </div>
      </div>

      {/* Sign Out Confirmation */}
      {showSignOutConfirm && (
        <div
          className="confirm-dialog-overlay"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog-title">Sign Out?</div>
            <div className="confirm-dialog-text">
              Are you sure you want to sign out of your account?
            </div>
            <div className="confirm-dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  background: "var(--accent-tertiary)",
                  borderColor: "var(--accent-tertiary)",
                }}
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
