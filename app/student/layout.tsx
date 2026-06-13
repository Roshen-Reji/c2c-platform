"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth, ProtectedRoute } from "@/lib/auth-context";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  IconDashboard,
  IconRoadmap,
  IconLeaderboard,
  IconProfile,
  IconSignOut,
  IconBell,
  IconMenu,
  IconClose,
  NotificationIcon,
} from "@/components/SvgIcons";
import "../portal.css";

interface Notification {
  type: "approved" | "rejected" | "comment" | "phase_unlock" | "milestone";
  message: string;
  isRead: boolean;
  createdAt: string | { seconds: number };
}

const NAV_ITEMS = [
  { href: "/student/dashboard", icon: IconDashboard, label: "Dashboard" },
  { href: "/student/roadmap", icon: IconRoadmap, label: "Roadmap" },
  { href: "/student/leaderboard", icon: IconLeaderboard, label: "Leaderboard" },
  { href: "/student/profile", icon: IconProfile, label: "Profile" },
];
function formatRelativeTime(dateInput: string | { seconds: number }): string {
  let date: Date;
  if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (dateInput && typeof dateInput === "object" && "seconds" in dateInput) {
    date = new Date(dateInput.seconds * 1000);
  } else {
    return "";
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationBell() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications from profile's recentNotifications array
  useEffect(() => {
    if (profile && (profile as unknown as Record<string, unknown>).recentNotifications) {
      const raw = (profile as unknown as Record<string, unknown>).recentNotifications as Notification[];
      if (Array.isArray(raw) && raw.length > 0) {
        setNotifications(raw.slice(0, 4));
      }
    }
  }, [profile]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const hasUnread = notifications.some((n) => !n.isRead);

  const markAsRead = async (index: number) => {
    const updated = [...notifications];
    updated[index] = { ...updated[index], isRead: true };
    setNotifications(updated);

    // Update Firestore if profile exists
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, "students", profile.uid), {
          recentNotifications: updated,
        });
      } catch {
        // Silently fail if Firestore not configured
      }
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        id="notification-bell"
      >
        <IconBell size={18} />
        {hasUnread && <span className="notification-unread-dot" />}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            {hasUnread && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--accent-primary)",
                }}
              >
                {notifications.filter((n) => !n.isRead).length} new
              </span>
            )}
          </div>
          <div className="notification-dropdown-body">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications yet</div>
            ) : (
              notifications.map((notif, i) => (
                <div
                  key={i}
                  className={`notification-item ${!notif.isRead ? "unread" : ""}`}
                  onClick={() => markAsRead(i)}
                >
                  <div className="notification-item-icon">
                    <NotificationIcon type={notif.type} size={16} />
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-message">{notif.message}</div>
                    <div className="notification-item-time">
                      {formatRelativeTime(notif.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    await logout();
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <Link href="/" className="sidebar-logo">
          C<span>2</span>C
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Main</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar-link-icon">
                  <Icon size={18} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.fullName || "Student"}</div>
              <div className="sidebar-user-role">{profile?.batch || "Student"}</div>
            </div>
          </div>
          <button
            className="btn-signout"
            onClick={() => setShowSignOutConfirm(true)}
          >
            <IconSignOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <button
        className="mobile-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
      </button>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="confirm-dialog-overlay" onClick={() => setShowSignOutConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
}

function StudentLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="portal-layout">
        <StudentSidebar />
        <main className="portal-main">
          <div className="portal-topbar">
            <NotificationBell />
          </div>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StudentLayoutInner>{children}</StudentLayoutInner>
    </AuthProvider>
  );
}
