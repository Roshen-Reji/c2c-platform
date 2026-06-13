"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { authenticatedJson } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { InterviewSlot } from "@/lib/program-types";
import {
  IconCalendar,
  IconClock,
  IconClose,
  IconUsers,
  IconVideo,
} from "@/components/SvgIcons";

const JitsiMeeting = dynamic(() => import("@/components/JitsiMeeting"), { ssr: false });

export default function VolunteerDashboard() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [activeSlot, setActiveSlot] = useState<InterviewSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    authenticatedJson<{ slots: InterviewSlot[] }>("/api/interviews")
      .then((result) => setSlots(result.slots))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  const canJoin = (slot: InterviewSlot) => {
    return now >= new Date(slot.startsAt).getTime() - 10 * 60_000 && now <= new Date(slot.endsAt).getTime() + 15 * 60_000;
  };

  return (
    <div>
      <div className="portal-header"><div><h1 className="portal-page-title">Volunteer <span className="accent-blue">Dashboard</span></h1><p className="portal-page-subtitle">Students under your care and every scheduled one-to-one meeting.</p></div></div>
      <div className="stats-grid"><div className="stat-card"><div className="stat-card-label"><IconUsers size={15} /> Assigned students</div><div className="stat-card-value accent-blue">{profile?.assignedStudents?.length || 0}</div></div><div className="stat-card"><div className="stat-card-label"><IconCalendar size={15} /> Interview slots</div><div className="stat-card-value accent-purple">{slots.length}</div></div><div className="stat-card"><div className="stat-card-label"><IconClock size={15} /> Upcoming</div><div className="stat-card-value accent-green">{slots.filter((slot) => new Date(slot.endsAt).getTime() >= now).length}</div></div></div>
      <h2 className="section-title">Interview schedule</h2>
      <div className="session-card-grid">
        {loading ? <div className="card empty-state"><div className="spinner" /></div> : slots.length === 0 ? <div className="card empty-state"><IconCalendar size={38} /><div className="empty-state-title">No interviews scheduled</div><div className="empty-state-text">Assigned interview times will appear here.</div></div> : slots.map((slot) => <article className="card session-card" key={slot.id}><div className="session-card-top"><span className="badge badge-purple">Interview</span><span className="badge badge-blue">{slot.status}</span></div><h3>{slot.studentName}</h3><p>{slot.dayTitle}</p><div className="session-card-meta"><span><IconClock size={14} /> {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: slot.timezone }).format(new Date(slot.startsAt))}</span><span>to {new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: slot.timezone }).format(new Date(slot.endsAt))}</span></div><button className="btn btn-primary" disabled={!canJoin(slot)} onClick={() => setActiveSlot(slot)}><IconVideo size={14} /> {canJoin(slot) ? "Join Interview" : "Opens 10 minutes before"}</button></article>)}
      </div>
      {activeSlot && <div className="meeting-overlay"><div className="meeting-shell"><div className="meeting-header"><div><strong>{activeSlot.studentName}</strong><span>{activeSlot.dayTitle}</span></div><button className="btn btn-ghost icon-button" onClick={() => setActiveSlot(null)}><IconClose size={17} /></button></div><JitsiMeeting roomName={activeSlot.roomName} displayName={profile?.fullName || "Volunteer"} onClose={() => setActiveSlot(null)} /></div></div>}
    </div>
  );
}
