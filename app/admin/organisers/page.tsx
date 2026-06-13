"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authenticatedJson } from "@/lib/api-client";
import type { ProgramDay } from "@/lib/program-types";
import {
  IconCalendar,
  IconCheckCircle,
  IconClose,
  IconPlus,
  IconUsers,
} from "@/components/SvgIcons";

interface Organiser {
  id: string;
  name: string;
  email: string;
  assignedDayIds: string[];
}

export default function AdminOrganisersPage() {
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [learningDays, setLearningDays] = useState<ProgramDay[]>([]);
  const [modal, setModal] = useState<"create" | "assign" | null>(null);
  const [selected, setSelected] = useState<Organiser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const [organiserSnapshot, phaseSnapshot] = await Promise.all([
        getDocs(query(collection(db, "organisers"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "phases"), orderBy("order"))),
      ]);
      setOrganisers(organiserSnapshot.docs.map((item) => ({
        id: item.id,
        name: item.data().fullName || item.data().name || "",
        email: item.data().email || "",
        assignedDayIds: item.data().assignedDayIds || item.data().assignedDays || [],
      })));
      const days: ProgramDay[] = [];
      for (const phase of phaseSnapshot.docs) {
        const snapshot = await getDocs(query(collection(db, "phases", phase.id, "days"), orderBy("order")));
        snapshot.docs.forEach((item) => {
          const data = item.data() as Omit<ProgramDay, "id" | "phaseId">;
          if (data.type === "learning") days.push({ id: item.id, phaseId: phase.id, ...data });
        });
      }
      setLearningDays(days);
    }
    void load();
  }, []);

  async function createOrganiser() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const result = await authenticatedJson<{ userId: string; tempPassword: string }>("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role: "organiser" }),
      });
      for (const reference of selectedDays) {
        const [phaseId, dayId] = reference.split("/");
        await authenticatedJson("/api/admin/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "organiser-day", organiserId: result.userId, phaseId, dayId }),
        });
      }
      setOrganisers((current) => [{ id: result.userId, name: name.trim(), email: email.trim(), assignedDayIds: selectedDays }, ...current]);
      setMessage(`Organiser created. Temporary password: ${result.tempPassword}`);
      setName("");
      setEmail("");
      setSelectedDays([]);
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the organiser.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignments() {
    if (!selected) return;
    setSaving(true);
    try {
      const current = new Set(selected.assignedDayIds);
      const next = new Set(selectedDays);
      for (const day of learningDays) {
        const reference = `${day.phaseId}/${day.id}`;
        if (current.has(reference) === next.has(reference)) continue;
        await authenticatedJson("/api/admin/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "organiser-day",
            action: next.has(reference) ? "assign" : "remove",
            organiserId: selected.id,
            phaseId: day.phaseId,
            dayId: day.id,
          }),
        });
      }
      setOrganisers((currentOrganisers) => currentOrganisers.map((item) => item.id === selected.id ? { ...item, assignedDayIds: selectedDays } : item));
      setMessage("Assignments updated.");
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update assignments.");
    } finally {
      setSaving(false);
    }
  }

  function openAssignments(organiser: Organiser) {
    setSelected(organiser);
    setSelectedDays(organiser.assignedDayIds);
    setModal("assign");
  }

  return (
    <div>
      <div className="portal-header"><div><h1 className="portal-page-title">Organiser <span className="accent-purple">Management</span></h1><p className="portal-page-subtitle">Create class owners and assign learning days in either direction.</p></div><button className="btn btn-primary" onClick={() => { setSelectedDays([]); setModal("create"); }}><IconPlus size={14} /> Add Organiser</button></div>
      {message && <div className="portal-notice success"><IconCheckCircle size={15} /> {message}</div>}
      <div className="stats-grid"><div className="stat-card"><div className="stat-card-label"><IconUsers size={15} /> Organisers</div><div className="stat-card-value accent-purple">{organisers.length}</div></div><div className="stat-card"><div className="stat-card-label"><IconCalendar size={15} /> Learning days</div><div className="stat-card-value accent-blue">{learningDays.length}</div></div></div>
      <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Assigned days</th><th /></tr></thead><tbody>{organisers.map((item) => <tr key={item.id}><td>{item.name}</td><td className="mono-text">{item.email}</td><td><span className="badge badge-blue">{item.assignedDayIds.length}</span></td><td style={{ textAlign: "right" }}><button className="btn btn-secondary" onClick={() => openAssignments(item)}>Manage days</button></td></tr>)}</tbody></table></div>
      {modal && <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal modal-wide" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2 className="modal-title">{modal === "create" ? "Create Organiser" : `Assign ${selected?.name}`}</h2><button className="modal-close" onClick={() => setModal(null)}><IconClose size={16} /></button></div>{modal === "create" && <div className="form-grid"><div className="input-group"><label className="input-label">Full name</label><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></div><div className="input-group"><label className="input-label">Email</label><input type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} /></div></div>}<DayChecklist days={learningDays} selected={selectedDays} onChange={setSelectedDays} /><div className="modal-actions"><button className="btn btn-primary" disabled={saving} onClick={modal === "create" ? createOrganiser : saveAssignments}>{saving ? "Saving..." : "Save"}</button><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button></div></div></div>}
    </div>
  );
}

function DayChecklist({ days, selected, onChange }: { days: ProgramDay[]; selected: string[]; onChange: (value: string[]) => void }) {
  return <div className="assignment-checklist"><h3>Learning days</h3>{days.map((day) => { const id = `${day.phaseId}/${day.id}`; return <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={(event) => onChange(event.target.checked ? [...selected, id] : selected.filter((item) => item !== id))} /><span><strong>{day.title}</strong><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: day.timezone }).format(new Date(day.startsAt))}</small></span></label>; })}{days.length === 0 && <p className="question-empty">Create a learning day first.</p>}</div>;
}
