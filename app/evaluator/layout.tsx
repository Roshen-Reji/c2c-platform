"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth-context";
import { IconClose, IconDashboard, IconFileText, IconMenu, IconSignOut } from "@/components/SvgIcons";
import "../portal.css";

function EvaluatorSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/evaluator/dashboard" className="sidebar-logo">C<span>2</span>C <span style={{ fontSize: "var(--text-xs)", color: "var(--accent-blue)" }}>Volunteer</span></Link>
        <nav className="sidebar-nav"><div className="sidebar-section-title">Navigation</div><Link href="/evaluator/dashboard" className={`sidebar-link ${pathname === "/evaluator/dashboard" ? "active" : ""}`} onClick={() => setOpen(false)}><span className="sidebar-link-icon"><IconDashboard size={18} /></span> Dashboard</Link><Link href="/evaluator/submissions" className={`sidebar-link ${pathname === "/evaluator/submissions" ? "active" : ""}`} onClick={() => setOpen(false)}><span className="sidebar-link-icon"><IconFileText size={18} /></span> Submissions</Link></nav>
        <div className="sidebar-footer"><div className="sidebar-user"><div className="sidebar-avatar" style={{ background: "linear-gradient(135deg, var(--accent-blue), var(--accent-secondary))" }}>V</div><div className="sidebar-user-info"><div className="sidebar-user-name">{profile?.fullName || "Volunteer"}</div><div className="sidebar-user-role">Volunteer</div></div></div><button className="btn btn-ghost w-full" style={{ marginTop: "var(--space-3)", justifyContent: "flex-start", gap: "var(--space-3)" }} onClick={logout}><IconSignOut size={16} /> Sign Out</button></div>
      </aside>
      <button className="mobile-sidebar-toggle" onClick={() => setOpen(!open)} aria-label="Toggle sidebar" style={{ background: "var(--accent-blue)" }}>{open ? <IconClose size={20} /> : <IconMenu size={20} />}</button>
    </>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["evaluator"]}><div className="portal-layout"><EvaluatorSidebar /><main className="portal-main">{children}</main></div></ProtectedRoute>;
}

export default function EvaluatorLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Inner>{children}</Inner></AuthProvider>;
}
