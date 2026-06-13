"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import {
  IconFlame,
  IconMapPin,
  IconClipboardCheck,
  IconCheckCircle,
  IconStar,
  IconTrophy,
  NotificationIcon,
} from "@/components/SvgIcons";

// ─── Count-up animation hook ────────────────────────────────
function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ─── Circular Progress Ring ─────────────────────────────────
function ProgressRing({
  current,
  total,
  label,
  size = 80,
  strokeWidth = 6,
}: {
  current: number;
  total: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="progress-ring-card">
      <svg
        className="progress-ring-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          className="progress-ring-text"
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fontSize="16"
        >
          {pct}%
        </text>
      </svg>
      <div className="progress-ring-info">
        <span className="progress-ring-label">{label}</span>
        <span className="progress-ring-count">
          {current} / {total}
        </span>
      </div>
    </div>
  );
}

// ─── Notification type helper for inline preview ────────────
interface Notification {
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string | { seconds: number };
}

// Demo notifications removed - will use empty array if no real notifications exist

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

// ─── Main Component ─────────────────────────────────────────
export default function StudentDashboard() {
  const { profile } = useAuth();

  const streak = useCountUp(profile?.streak ?? 0);
  const testsTaken = useCountUp(profile?.testsTaken ?? 0);
  const tasksDone = useCountUp(profile?.tasksSubmitted ?? 0);
  const totalPoints = useCountUp(profile?.totalPoints ?? 0);

  const stats = [
    {
      label: "Day Streak",
      value: streak,
      icon: IconFlame,
      color: "var(--accent-tertiary)",
      bgColor: "rgba(255, 107, 71, 0.1)",
    },
    {
      label: "Current Phase",
      value: "1",
      icon: IconMapPin,
      color: "var(--accent-primary)",
      bgColor: "rgba(232, 255, 71, 0.1)",
      sub: "Foundation",
    },
    {
      label: "Tests Taken",
      value: testsTaken,
      icon: IconClipboardCheck,
      color: "var(--accent-blue)",
      bgColor: "rgba(71, 184, 255, 0.1)",
    },
    {
      label: "Tasks Done",
      value: tasksDone,
      icon: IconCheckCircle,
      color: "var(--accent-secondary)",
      bgColor: "rgba(71, 255, 167, 0.1)",
    },
    {
      label: "Total Points",
      value: totalPoints,
      icon: IconStar,
      color: "var(--accent-primary)",
      bgColor: "rgba(232, 255, 71, 0.1)",
    },
    {
      label: "Rank",
      value: "#—",
      icon: IconTrophy,
      color: "var(--accent-purple)",
      bgColor: "rgba(180, 127, 255, 0.1)",
    },
  ];

  const completionStats = [
    {
      label: "Tasks Submitted",
      current: profile?.tasksSubmitted ?? 0,
      total: 14,
    },
    {
      label: "Tasks Approved",
      current: profile?.tasksApproved ?? 0,
      total: profile?.tasksSubmitted ?? 0,
    },
    {
      label: "Days Completed",
      current: profile?.daysCompleted ?? 0,
      total: 24,
    },
  ];

  // Get notifications from profile or use empty array
  const notifications: Notification[] =
    ((profile as unknown as Record<string, unknown>)?.recentNotifications as Notification[] | undefined) ??
    [];

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">
            Welcome,{" "}
            <span className="accent-yellow">
              {profile?.fullName?.split(" ")[0] || "Student"}
            </span>
          </h1>
          <p className="portal-page-subtitle">Here&apos;s your progress overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div className="stat-card" key={i} id={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="stat-card-header">
                <span className="stat-card-label">{stat.label}</span>
                <div
                  className="stat-card-icon"
                  style={{ background: stat.bgColor }}
                >
                  <Icon size={18} color={stat.color} />
                </div>
              </div>
              <div className="stat-card-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
              {stat.sub && <div className="stat-card-sub">{stat.sub}</div>}
            </div>
          );
        })}
      </div>

      {/* Completion Status — Circular Rings */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-lg)",
            marginBottom: "var(--space-4)",
          }}
        >
          Completion Status
        </h2>
        <div className="progress-rings-grid">
          {completionStats.map((item, i) => (
            <ProgressRing
              key={i}
              current={item.current}
              total={item.total}
              label={item.label}
            />
          ))}
        </div>
      </div>

      {/* Recent Notifications Preview */}
      <div>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-lg)",
            marginBottom: "var(--space-4)",
          }}
        >
          Recent Notifications
        </h2>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {notifications.slice(0, 3).map((notif, i) => (
            <div
              key={i}
              className={`notification-item ${!notif.isRead ? "unread" : ""}`}
              style={{ cursor: "default" }}
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
          ))}
          {notifications.length === 0 && (
            <div className="notification-empty">No notifications yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
