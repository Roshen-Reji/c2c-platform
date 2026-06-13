"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { ProgramDay } from "@/lib/program-types";
import {
  IconCalendar,
  IconClock,
  IconExternalLink,
  IconUsers,
  IconVideo,
} from "@/components/SvgIcons";

function formatSchedule(day: ProgramDay) {
  const timeZone = day.timezone || "Asia/Kolkata";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(day.startsAt));
}

export default function OrganiserDashboard() {
  const { profile } = useAuth();
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const organiserId = profile.uid;
    const assignedDayIds = profile.assignedDayIds || [];
    async function load() {
      try {
        const phaseSnapshot = await getDocs(query(collection(db, "phases"), orderBy("order")));
        const assigned: ProgramDay[] = [];
        for (const phase of phaseSnapshot.docs) {
          const daySnapshot = await getDocs(
            query(collection(db, "phases", phase.id, "days"), orderBy("order")),
          );
          daySnapshot.docs.forEach((item) => {
            const data = item.data() as Omit<ProgramDay, "id" | "phaseId">;
            if (
              data.type === "learning" &&
              (data.learningConfig?.organiserId === organiserId ||
                assignedDayIds.includes(`${phase.id}/${item.id}`))
            ) {
              assigned.push({ id: item.id, phaseId: phase.id, ...data });
            }
          });
        }
        assigned.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        setDays(assigned);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [profile]);

  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);
  const upcoming = days.filter((day) => new Date(day.endsAt).getTime() >= now);

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">Organiser <span className="accent-purple">Dashboard</span></h1>
          <p className="portal-page-subtitle">Your assigned learning sessions, schedules, and meeting rooms.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-card-label"><IconCalendar size={15} /> Assigned sessions</div><div className="stat-card-value accent-purple">{days.length}</div></div>
        <div className="stat-card"><div className="stat-card-label"><IconClock size={15} /> Upcoming</div><div className="stat-card-value accent-blue">{upcoming.length}</div></div>
        <div className="stat-card"><div className="stat-card-label"><IconVideo size={15} /> With Meet links</div><div className="stat-card-value accent-green">{days.filter((day) => day.learningConfig?.meetLink).length}</div></div>
      </div>

      <h2 className="section-title">Your learning days</h2>
      <div className="session-card-grid">
        {loading ? (
          <div className="card empty-state"><div className="spinner" /></div>
        ) : days.length === 0 ? (
          <div className="card empty-state"><IconUsers size={38} /><div className="empty-state-title">No learning days assigned</div><div className="empty-state-text">An admin can assign you while creating or editing a learning day.</div></div>
        ) : (
          days.map((day) => (
            <article className="card session-card" key={day.id}>
              <div className="session-card-top"><span className="badge badge-blue">Learning</span><span className={`badge ${day.published ? "badge-green" : "badge-primary"}`}>{day.published ? "Published" : "Draft"}</span></div>
              <h3>{day.title}</h3>
              <p>{day.description || "No description provided."}</p>
              <div className="session-card-meta"><span><IconClock size={14} /> {formatSchedule(day)}</span><span>Ends {new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: day.timezone }).format(new Date(day.endsAt))}</span></div>
              {day.learningConfig?.meetLink ? (
                <a className="btn btn-primary" href={day.learningConfig.meetLink} target="_blank" rel="noreferrer"><IconExternalLink size={14} /> Join Google Meet</a>
              ) : (
                <div className="portal-notice error">No meeting link has been assigned yet.</div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
