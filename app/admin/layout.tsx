"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth-context";
import {
  IconBarChart,
  IconClose,
  IconDashboard,
  IconFileText,
  IconMenu,
  IconProfile,
  IconSignOut,
  IconUsers,
} from "@/components/SvgIcons";
import "../portal.css";

const NAV_ITEMS = [
  { href: "/admin", icon: IconDashboard, label: "Dashboard" },
  { href: "/admin/phases", icon: IconFileText, label: "Phases & Days" },
  { href: "/admin/students", icon: IconProfile, label: "Students" },
  { href: "/admin/organisers", icon: IconUsers, label: "Organisers" },
  { href: "/admin/evaluators", icon: IconBarChart, label: "Volunteers" },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/admin" className="sidebar-logo">C<span>2</span>C <span style={{ fontSize: "var(--text-xs)", color: "var(--accent-tertiary)" }}>Admin</span></Link>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Management</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href ? "active" : ""}`} onClick={() => setOpen(false)}><span className="sidebar-link-icon"><Icon size={18} /></span>{item.label}</Link>;
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user"><div className="sidebar-avatar" style={{ background: "linear-gradient(135deg, var(--accent-tertiary), var(--accent-purple))" }}>A</div><div className="sidebar-user-info"><div className="sidebar-user-name">{profile?.fullName || "Admin"}</div><div className="sidebar-user-role">Administrator</div></div></div>
          <button className="btn btn-ghost w-full" style={{ marginTop: "var(--space-3)", justifyContent: "flex-start", gap: "var(--space-3)" }} onClick={logout}><IconSignOut size={16} /> Sign Out</button>
        </div>
      </aside>
      <button className="mobile-sidebar-toggle" onClick={() => setOpen(!open)} aria-label="Toggle sidebar" style={{ background: "var(--accent-tertiary)" }}>{open ? <IconClose size={20} /> : <IconMenu size={20} />}</button>
    </>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["admin"]}><div className="portal-layout"><AdminSidebar /><main className="portal-main">{children}</main></div></ProtectedRoute>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><AdminLayoutInner>{children}</AdminLayoutInner></AuthProvider>;
}
