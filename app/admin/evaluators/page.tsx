"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authenticatedJson } from "@/lib/api-client";
import type { InterviewSlot, ProgramDay } from "@/lib/program-types";
import {
  IconCalendar,
  IconCheckCircle,
  IconClose,
  IconClock,
  IconPlus,
  IconUsers,
} from "@/components/SvgIcons";

interface Volunteer {
  id: string;
  name: string;
  email: string;
  assignedStudents: string[];
}

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [interviewDays, setInterviewDays] = useState<ProgramDay[]>([]);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [modal, setModal] = useState<"create" | "assign" | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [dayReference, setDayReference] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const studentNames = useMemo(
    () => new Map(students.map((student) => [student.id, student.name])),
    [students],
  );

  useEffect(() => {
    async function load() {
      const [volunteerSnapshot, studentSnapshot, phaseSnapshot, slotResult] = await Promise.all([
        getDocs(query(collection(db, "evaluators"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "students"), orderBy("fullName"))),
        getDocs(query(collection(db, "phases"), orderBy("order"))),
        authenticatedJson<{ slots: InterviewSlot[] }>("/api/interviews"),
      ]);
      setVolunteers(volunteerSnapshot.docs.map((item) => ({
        id: item.id,
        name: item.data().fullName || item.data().name || "",
        email: item.data().email || "",
        assignedStudents: item.data().assignedStudents || [],
      })));
      setStudents(studentSnapshot.docs.filter((item) => (item.data().role || "student") === "student").map((item) => ({
        id: item.id,
        name: item.data().fullName || "",
        email: item.data().email || "",
      })));
      const days: ProgramDay[] = [];
      for (const phase of phaseSnapshot.docs) {
        const daySnapshot = await getDocs(query(collection(db, "phases", phase.id, "days"), orderBy("order")));
        daySnapshot.docs.forEach((item) => {
          const data = item.data() as Omit<ProgramDay, "id" | "phaseId">;
          if (data.type === "interview") days.push({ id: item.id, phaseId: phase.id, ...data });
        });
      }
      setInterviewDays(days);
      setSlots(slotResult.slots);
    }
    void load();
  }, []);

  function resetAssignment() {
    setStudentId("");
    setDayReference("");
    setStartsAt("");
    setEndsAt("");
  }

  async function createVolunteer() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const result = await authenticatedJson<{ userId: string; tempPassword: string }>("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role: "evaluator" }),
      });
      setVolunteers((current) => [{ id: result.userId, name: name.trim(), email: email.trim(), assignedStudents: [] }, ...current]);
      setMessage(`Volunteer created. Temporary password: ${result.tempPassword}`);
      setName("");
      setEmail("");
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the volunteer.");
    } finally {
      setSaving(false);
    }
  }

  async function assignStudent() {
    if (!selectedVolunteer || !studentId) return;
    const [phaseId, dayId] = dayReference.split("/");
    setSaving(true);
    try {
      await authenticatedJson("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "volunteer-student",
          volunteerId: selectedVolunteer.id,
          studentId,
          phaseId: phaseId || undefined,
          dayId: dayId || undefined,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          timezone: "Asia/Kolkata",
        }),
      });
      setVolunteers((current) => current.map((item) => item.id === selectedVolunteer.id ? { ...item, assignedStudents: Array.from(new Set([...item.assignedStudents, studentId])) } : item));
      if (dayId && startsAt && endsAt) {
        const day = interviewDays.find((item) => item.id === dayId);
        const student = students.find((item) => item.id === studentId);
        setSlots((current) => [...current.filter((slot) => !(slot.dayId === dayId && slot.studentId === studentId)), {
          id: `${dayId}_${studentId}`,
          phaseId,
          dayId,
          dayTitle: day?.title || "",
          studentId,
          studentName: student?.name || "",
          volunteerId: selectedVolunteer.id,
          volunteerName: selectedVolunteer.name,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          timezone: "Asia/Kolkata",
          roomName: "Created securely on the server",
          status: "scheduled",
        }]);
      }
      setMessage("Student assignment and interview slot saved.");
      resetAssignment();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the assignment.");
    } finally {
      setSaving(false);
    }
  }

  function selectInterviewDay(reference: string) {
    setDayReference(reference);
    const [, dayId] = reference.split("/");
    const day = interviewDays.find((item) => item.id === dayId);
    if (!day) return;
    const start = new Date(day.startsAt);
    const end = new Date(start.getTime() + (day.interviewConfig?.durationMinutes || 30) * 60_000);
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setStartsAt(local(start));
    setEndsAt(local(end));
  }

  return (
    <div>
      <div className="portal-header"><div><h1 className="portal-page-title">Volunteer <span className="accent-blue">Management</span></h1><p className="portal-page-subtitle">Assign each student a responsible volunteer and a precise interview slot.</p></div><button className="btn btn-primary" onClick={() => setModal("create")}><IconPlus size={14} /> Add Volunteer</button></div>
      {message && <div className="portal-notice success"><IconCheckCircle size={15} /> {message}</div>}
      <div className="stats-grid"><div className="stat-card"><div className="stat-card-label"><IconUsers size={15} /> Volunteers</div><div className="stat-card-value accent-blue">{volunteers.length}</div></div><div className="stat-card"><div className="stat-card-label"><IconUsers size={15} /> Assigned students</div><div className="stat-card-value accent-green">{new Set(volunteers.flatMap((item) => item.assignedStudents)).size}</div></div><div className="stat-card"><div className="stat-card-label"><IconCalendar size={15} /> Interview slots</div><div className="stat-card-value accent-purple">{slots.length}</div></div></div>
      <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Volunteer</th><th>Email</th><th>Students</th><th>Scheduled slots</th><th /></tr></thead><tbody>{volunteers.map((volunteer) => <tr key={volunteer.id}><td>{volunteer.name}</td><td className="mono-text">{volunteer.email}</td><td>{volunteer.assignedStudents.length ? volunteer.assignedStudents.map((id) => studentNames.get(id) || id).join(", ") : "None"}</td><td><span className="badge badge-purple">{slots.filter((slot) => slot.volunteerId === volunteer.id).length}</span></td><td style={{ textAlign: "right" }}><button className="btn btn-secondary" onClick={() => { setSelectedVolunteer(volunteer); resetAssignment(); setModal("assign"); }}>Assign student</button></td></tr>)}</tbody></table></div>
      {modal === "create" && <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2 className="modal-title">Create Volunteer</h2><button className="modal-close" onClick={() => setModal(null)}><IconClose size={16} /></button></div><div className="input-group"><label className="input-label">Full name</label><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></div><div className="input-group"><label className="input-label">Email</label><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="modal-actions"><button className="btn btn-primary" disabled={saving} onClick={createVolunteer}>{saving ? "Creating..." : "Create Volunteer"}</button></div></div></div>}
      {modal === "assign" && selectedVolunteer && <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal modal-wide" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><h2 className="modal-title">Assign to {selectedVolunteer.name}</h2><p className="modal-subtitle">The interview schedule is optional; student responsibility is always saved.</p></div><button className="modal-close" onClick={() => setModal(null)}><IconClose size={16} /></button></div><div className="form-grid"><div className="input-group"><label className="input-label">Student</label><select className="input select" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}</select></div><div className="input-group"><label className="input-label">Interview day</label><select className="input select" value={dayReference} onChange={(event) => selectInterviewDay(event.target.value)}><option value="">No interview yet</option>{interviewDays.map((day) => <option key={day.id} value={`${day.phaseId}/${day.id}`}>{day.title}</option>)}</select></div><div className="input-group"><label className="input-label">Student slot starts</label><input className="input" type="datetime-local" value={startsAt} disabled={!dayReference} onChange={(event) => setStartsAt(event.target.value)} /></div><div className="input-group"><label className="input-label">Student slot ends</label><input className="input" type="datetime-local" value={endsAt} disabled={!dayReference} onChange={(event) => setEndsAt(event.target.value)} /></div></div><div className="portal-notice success"><IconClock size={15} /> The same slot and Jitsi room will appear in both the student and volunteer portals.</div><div className="modal-actions"><button className="btn btn-primary" disabled={saving || !studentId || (!!dayReference && (!startsAt || !endsAt))} onClick={assignStudent}>{saving ? "Saving..." : "Save Assignment"}</button></div></div></div>}
    </div>
  );
}
