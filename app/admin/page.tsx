"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  IconArrowRight,
  IconBarChart,
  IconClock,
  IconFileText,
  IconProfile,
  IconUsers,
} from "@/components/SvgIcons";
import "../landing.css"; // Reuse landing page glowing and hero styles

interface Stats {
  totalStudents: number;
  pendingApprovals: number;
  activePhases: number;
  organisers: number;
  evaluators: number;
  approvedStudents: number;
}

const PORTALS = [
  {
    title: "Phases & Days",
    description: "Manage phases, days, sessions, tasks, and tests. Full control over the program structure.",
    href: "/admin/phases",
    color: "var(--accent-tertiary)",
    badge: "Program",
  },
  {
    title: "Students",
    description: "View registered students, verify payments, approve or reject registrations.",
    href: "/admin/students",
    color: "var(--accent-primary)",
    badge: "Management",
  },
  {
    title: "Organisers",
    description: "Create and manage organiser/speaker accounts. Assign them to specific sessions.",
    href: "/admin/organisers",
    color: "var(--accent-purple)",
    badge: "Team",
  },
  {
    title: "Evaluators",
    description: "Create evaluator accounts and assign specific student groups for monitoring.",
    href: "/admin/evaluators",
    color: "var(--accent-blue)",
    badge: "Volunteers",
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    pendingApprovals: 0,
    activePhases: 0,
    organisers: 0,
    evaluators: 0,
    approvedStudents: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [studentsSnap, pendingSnap, phasesSnap, organisersSnap, evaluatorsSnap, approvedSnap] =
          await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(query(collection(db, "students"), where("status", "==", "pending"))),
            getDocs(collection(db, "phases")),
            getDocs(collection(db, "organisers")),
            getDocs(collection(db, "evaluators")),
            getDocs(query(collection(db, "students"), where("status", "==", "approved"))),
          ]);

        setStats({
          totalStudents: studentsSnap.size,
          pendingApprovals: pendingSnap.size,
          activePhases: phasesSnap.size,
          organisers: organisersSnap.size,
          evaluators: evaluatorsSnap.size,
          approvedStudents: approvedSnap.size,
        });
      } catch {
        // Demo mode - stats stay at 0
      }
    }

    loadStats();
    
    // Add scroll reveal observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".animate-reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Background glow effects from landing page theme */}
      <div className="hero-bg-glow hero-bg-glow-1" style={{ top: '-10%', right: '-5%', opacity: 0.2 }} />
      <div className="hero-bg-glow hero-bg-glow-2" style={{ bottom: '-10%', left: '-5%', opacity: 0.15 }} />

      <div className="portal-header animate-reveal" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <h1 className="portal-page-title">
            Admin <span className="accent-orange">Dashboard</span>
          </h1>
          <p className="portal-page-subtitle">Manage the Campus 2 Corporate program</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger-children" style={{ position: "relative", zIndex: 1 }}>
        <div className="stat-card card-glass animate-reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <IconUsers size={18} /> Total Students
          </div>
          <div className="stat-card-value accent-yellow" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>{stats.totalStudents}</div>
          <div className="stat-card-sub">{stats.approvedStudents} approved</div>
        </div>
        <div className="stat-card card-glass animate-reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <IconClock size={18} /> Pending Approvals
          </div>
          <div className="stat-card-value accent-orange" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>{stats.pendingApprovals}</div>
          <div className="stat-card-sub">awaiting verification</div>
        </div>
        <div className="stat-card card-glass animate-reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <IconFileText size={18} /> Active Phases
          </div>
          <div className="stat-card-value accent-green" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>{stats.activePhases}</div>
          <div className="stat-card-sub">of 5</div>
        </div>
        <div className="stat-card card-glass animate-reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <IconUsers size={18} /> Organisers
          </div>
          <div className="stat-card-value accent-purple" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>{stats.organisers}</div>
          <div className="stat-card-sub">assigned</div>
        </div>
        <div className="stat-card card-glass animate-reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <IconBarChart size={18} /> Volunteers
          </div>
          <div className="stat-card-value accent-blue" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>{stats.evaluators}</div>
          <div className="stat-card-sub">volunteers</div>
        </div>
      </div>

      {/* Quick Access */}
      <h2
        className="animate-reveal"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          marginBottom: "var(--space-6)",
          marginTop: "var(--space-8)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          position: "relative",
          zIndex: 1
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-primary)", display: "inline-block", boxShadow: "0 0 10px var(--accent-primary)" }}></span>
        Quick Access
      </h2>

      <div
        className="stagger-children"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-6)",
          position: "relative",
          zIndex: 1
        }}
      >
        {PORTALS.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            className="card-glass card-interactive animate-reveal"
            style={{ 
              textDecoration: "none", 
              position: "relative", 
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              transition: "all 0.3s ease"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: portal.color,
                boxShadow: `0 0 15px ${portal.color}`,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-4)",
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-glass)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                border: "1px solid var(--border-subtle)"
              }}>
                <PortalIcon href={portal.href} />
              </div>
              <span className="badge" style={{ 
                background: `color-mix(in srgb, ${portal.color} 15%, transparent)`,
                color: portal.color,
                border: `1px solid color-mix(in srgb, ${portal.color} 30%, transparent)`
              }}>{portal.badge}</span>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-2)",
                color: "var(--text-primary)"
              }}
            >
              {portal.title}
            </h3>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                flexGrow: 1
              }}
            >
              {portal.description}
            </p>
            <div style={{
              marginTop: "var(--space-6)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              color: portal.color,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Manage <span style={{ transition: "transform 0.2s ease-out", display: "inline-flex" }} className="arrow-icon"><IconArrowRight size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .card-interactive:hover .arrow-icon {
          transform: translateX(4px);
        }
      `}} />
    </div>
  );
}

function PortalIcon({ href }: { href: string }) {
  if (href.includes("students")) return <IconProfile size={24} />;
  if (href.includes("organisers")) return <IconUsers size={24} />;
  if (href.includes("evaluators")) return <IconBarChart size={24} />;
  return <IconFileText size={24} />;
}
