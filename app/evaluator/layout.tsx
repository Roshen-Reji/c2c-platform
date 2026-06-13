"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth, ProtectedRoute } from "@/lib/auth-context";
import "../portal.css";

function EvaluatorSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/evaluator/dashboard" className="sidebar-logo">C<span>2</span>C <span style={{ fontSize: "var(--text-xs)", color: "var(--accent-blue)" }}>Evaluator</span></Link>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Navigation</div>
          <Link href="/evaluator/dashboard" className={`sidebar-link ${pathname === "/evaluator/dashboard" ? "active" : ""}`} onClick={() => setOpen(false)}>
            <span className="sidebar-link-icon">📊</span> Dashboard
          </Link>
          <Link href="/evaluator/submissions" className={`sidebar-link ${pathname === "/evaluator/submissions" ? "active" : ""}`} onClick={() => setOpen(false)}>
            <span className="sidebar-link-icon">📝</span> Submissions
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: "linear-gradient(135deg, var(--accent-blue), var(--accent-secondary))" }}>E</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.fullName || "Evaluator"}</div>
              <div className="sidebar-user-role">Evaluator</div>
            </div>
          </div>
          <button className="btn btn-ghost w-full" style={{ marginTop: "var(--space-3)", justifyContent: "flex-start", gap: "var(--space-3)" }} onClick={logout}>🚪 Sign Out</button>
        </div>
      </aside>
      <button className="mobile-sidebar-toggle" onClick={() => setOpen(!open)} style={{ background: "var(--accent-blue)" }}>☰</button>
    </>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["evaluator"]}>
      <div className="portal-layout"><EvaluatorSidebar /><main className="portal-main">{children}</main></div>
    </ProtectedRoute>
  );
}

export default function EvaluatorLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Inner>{children}</Inner></AuthProvider>;
}
