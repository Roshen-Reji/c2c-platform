"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authenticatedJson } from "@/lib/api-client";
import {
  getDayAccessState,
  type DayType,
  type ProgramDay,
  type ProgramQuestion,
} from "@/lib/program-types";
import {
  DayTypeIcon,
  IconAlertTriangle,
  IconCalendar,
  IconCheckCircle,
  IconChevronDown,
  IconClock,
  IconClose,
  IconEdit,
  IconExternalLink,
  IconFileText,
  IconPlus,
  IconTrash,
  IconUsers,
  IconVideo,
} from "@/components/SvgIcons";

interface Phase {
  id: string;
  title: string;
  description: string;
  order: number;
  days: ProgramDay[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface DayForm {
  title: string;
  type: DayType;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  published: boolean;
  organiserId: string;
  meetLink: string;
  submissionType: "link" | "file" | "video" | "text";
  instructions: string;
  maxPoints: number;
  durationMinutes: number;
  monitoringEnabled: boolean;
  cameraRequired: boolean;
  warningLimit: number;
  shuffleQuestions: boolean;
  allowBackNavigation: boolean;
  interviewType: "technical" | "hr" | "mixed";
  defaultVolunteerId: string;
  questions: ProgramQuestion[];
}

const TYPE_BADGE: Record<DayType, string> = {
  learning: "badge-blue",
  task: "badge-green",
  test: "badge-orange",
  interview: "badge-purple",
};

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultForm(): DayForm {
  const start = new Date(Date.now() + 24 * 60 * 60_000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    title: "",
    type: "learning",
    description: "",
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
    timezone: "Asia/Kolkata",
    published: true,
    organiserId: "",
    meetLink: "",
    submissionType: "link",
    instructions: "",
    maxPoints: 20,
    durationMinutes: 30,
    monitoringEnabled: true,
    cameraRequired: true,
    warningLimit: 3,
    shuffleQuestions: false,
    allowBackNavigation: true,
    interviewType: "mixed",
    defaultVolunteerId: "",
    questions: [],
  };
}

function dayToForm(day: ProgramDay): DayForm {
  return {
    ...defaultForm(),
    title: day.title,
    type: day.type,
    description: day.description,
    startsAt: toLocalInput(day.startsAt),
    endsAt: toLocalInput(day.endsAt),
    timezone: day.timezone || "Asia/Kolkata",
    published: day.published,
    organiserId: day.learningConfig?.organiserId || "",
    meetLink: day.learningConfig?.meetLink || "",
    submissionType: day.taskConfig?.submissionType || "link",
    instructions: day.taskConfig?.instructions || "",
    maxPoints: day.taskConfig?.maxPoints || 20,
    durationMinutes:
      day.testConfig?.durationMinutes || day.interviewConfig?.durationMinutes || 30,
    monitoringEnabled: day.testConfig?.monitoringEnabled !== false,
    cameraRequired: day.testConfig?.cameraRequired !== false,
    warningLimit: day.testConfig?.warningLimit || 3,
    shuffleQuestions: Boolean(day.testConfig?.shuffleQuestions),
    allowBackNavigation: day.testConfig?.allowBackNavigation !== false,
    interviewType: day.interviewConfig?.interviewType || "mixed",
    defaultVolunteerId: day.interviewConfig?.defaultVolunteerId || "",
    questions: day.testConfig?.questions || day.taskConfig?.questions || [],
  };
}

function formatWindow(day: ProgramDay) {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: day.timezone || "Asia/Kolkata",
  };
  return `${new Intl.DateTimeFormat("en-IN", options).format(new Date(day.startsAt))} to ${new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: day.timezone || "Asia/Kolkata" }).format(new Date(day.endsAt))}`;
}

export default function AdminPhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [organisers, setOrganisers] = useState<TeamMember[]>([]);
  const [volunteers, setVolunteers] = useState<TeamMember[]>([]);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [phaseModal, setPhaseModal] = useState(false);
  const [dayModal, setDayModal] = useState<{ phaseId: string; day?: ProgramDay } | null>(null);
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseDescription, setPhaseDescription] = useState("");
  const [form, setForm] = useState<DayForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalDays = useMemo(
    () => phases.reduce((count, phase) => count + phase.days.length, 0),
    [phases],
  );

  useEffect(() => {
    async function load() {
      try {
        const [phaseSnapshot, organiserSnapshot, volunteerSnapshot] = await Promise.all([
          getDocs(query(collection(db, "phases"), orderBy("order"))),
          getDocs(query(collection(db, "organisers"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "evaluators"), orderBy("createdAt", "desc"))),
        ]);

        const loaded: Phase[] = [];
        for (const phaseDoc of phaseSnapshot.docs) {
          const data = phaseDoc.data();
          const daySnapshot = await getDocs(
            query(collection(db, "phases", phaseDoc.id, "days"), orderBy("order")),
          );
          loaded.push({
            id: phaseDoc.id,
            title: data.title,
            description: data.description || "",
            order: data.order || loaded.length + 1,
            days: daySnapshot.docs.map((item) => ({
              id: item.id,
              phaseId: phaseDoc.id,
              ...(item.data() as Omit<ProgramDay, "id" | "phaseId">),
            })),
          });
        }
        setPhases(loaded);
        setExpandedPhase(loaded[0]?.id || null);
        setOrganisers(
          organiserSnapshot.docs.map((item) => ({
            id: item.id,
            name: item.data().fullName || item.data().name || "",
            email: item.data().email || "",
          })),
        );
        setVolunteers(
          volunteerSnapshot.docs.map((item) => ({
            id: item.id,
            name: item.data().fullName || item.data().name || "",
            email: item.data().email || "",
          })),
        );
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not load the program." });
      }
    }
    void load();
  }, []);

  function openDayModal(phaseId: string, day?: ProgramDay) {
    setForm(day ? dayToForm(day) : defaultForm());
    setDayModal({ phaseId, day });
    setMessage(null);
  }

  function addQuestion(type: "mcq" | "text") {
    setForm((current) => ({
      ...current,
      questions: [
        ...current.questions,
        {
          id: `q-${Date.now()}-${current.questions.length}`,
          type,
          prompt: "",
          options: type === "mcq" ? ["", "", "", ""] : undefined,
          correctOption: type === "mcq" ? 0 : undefined,
          points: 1,
          required: true,
        },
      ],
    }));
  }

  function updateQuestion(index: number, patch: Partial<ProgramQuestion>) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, itemIndex) =>
        itemIndex === index ? { ...question, ...patch } : question,
      ),
    }));
  }

  function buildDayPayload(phaseId: string, order: number) {
    const organiser = organisers.find((item) => item.id === form.organiserId);
    const volunteer = volunteers.find((item) => item.id === form.defaultVolunteerId);
    return {
      phaseId,
      title: form.title.trim(),
      type: form.type,
      description: form.description.trim(),
      order,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      timezone: form.timezone,
      published: form.published,
      learningConfig: {
        organiserId: form.organiserId,
        organiserName: organiser?.name || "",
        meetLink: form.meetLink.trim(),
      },
      taskConfig: {
        submissionType: form.submissionType,
        instructions: form.instructions.trim(),
        maxPoints: form.maxPoints,
        maxRecordings: 1,
        questions: form.questions,
      },
      testConfig: {
        questions: form.questions,
        durationMinutes: form.durationMinutes,
        monitoringEnabled: form.monitoringEnabled,
        cameraRequired: form.cameraRequired,
        warningLimit: form.warningLimit,
        shuffleQuestions: form.shuffleQuestions,
        allowBackNavigation: form.allowBackNavigation,
      },
      interviewConfig: {
        interviewType: form.interviewType,
        durationMinutes: form.durationMinutes,
        defaultVolunteerId: form.defaultVolunteerId,
        defaultVolunteerName: volunteer?.name || "",
      },
    };
  }

  async function createPhase() {
    if (!phaseTitle.trim()) return;
    setSaving(true);
    try {
      const result = await authenticatedJson<{ phaseId: string }>("/api/admin/create-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: phaseTitle,
          description: phaseDescription,
          order: phases.length + 1,
        }),
      });
      const phase = {
        id: result.phaseId,
        title: phaseTitle.trim(),
        description: phaseDescription.trim(),
        order: phases.length + 1,
        days: [],
      };
      setPhases((current) => [...current, phase]);
      setExpandedPhase(phase.id);
      setPhaseTitle("");
      setPhaseDescription("");
      setPhaseModal(false);
      setMessage({ type: "success", text: "Phase created." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not create the phase." });
    } finally {
      setSaving(false);
    }
  }

  async function saveDay() {
    if (!dayModal || !form.title.trim() || !form.startsAt || !form.endsAt) return;
    const phase = phases.find((item) => item.id === dayModal.phaseId);
    if (!phase) return;
    setSaving(true);
    try {
      const payload = buildDayPayload(
        phase.id,
        dayModal.day?.order || phase.days.length + 1,
      );
      const endpoint = dayModal.day
        ? `/api/admin/days/${phase.id}/${dayModal.day.id}`
        : "/api/admin/create-day";
      const result = await authenticatedJson<{ dayId?: string }>(endpoint, {
        method: dayModal.day ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const savedDay: ProgramDay = {
        id: dayModal.day?.id || result.dayId || "",
        ...payload,
      };
      setPhases((current) =>
        current.map((item) =>
          item.id !== phase.id
            ? item
            : {
                ...item,
                days: dayModal.day
                  ? item.days.map((day) => (day.id === savedDay.id ? savedDay : day))
                  : [...item.days, savedDay],
              },
        ),
      );
      setDayModal(null);
      setMessage({ type: "success", text: dayModal.day ? "Day updated." : "Day created." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not save the day." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteDay(day: ProgramDay) {
    if (!window.confirm(`Delete "${day.title}"? Existing submissions will remain for audit purposes.`)) return;
    try {
      await authenticatedJson(`/api/admin/days/${day.phaseId}/${day.id}`, { method: "DELETE" });
      setPhases((current) =>
        current.map((phase) =>
          phase.id === day.phaseId
            ? { ...phase, days: phase.days.filter((item) => item.id !== day.id) }
            : phase,
        ),
      );
      setMessage({ type: "success", text: "Day deleted." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not delete the day." });
    }
  }

  async function generateMeet() {
    if (!form.title || !form.startsAt || !form.endsAt) {
      setMessage({ type: "error", text: "Set the title and schedule before generating a Meet link." });
      return;
    }
    setGeneratingMeet(true);
    try {
      const organiser = organisers.find((item) => item.id === form.organiserId);
      const result = await authenticatedJson<{ meetLink: string }>("/api/admin/create-meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          timezone: form.timezone,
          attendeeEmails: organiser?.email ? [organiser.email] : [],
        }),
      });
      setForm((current) => ({ ...current, meetLink: result.meetLink }));
      setMessage({ type: "success", text: "Google Meet event created." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not generate the Meet link." });
    } finally {
      setGeneratingMeet(false);
    }
  }

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">Program <span className="accent-yellow">Days</span></h1>
          <p className="portal-page-subtitle">Schedule every learning session, task, test, and interview from one place.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPhaseModal(true)}>
          <IconPlus size={15} /> Create Phase
        </button>
      </div>

      {message && (
        <div className={`portal-notice ${message.type}`} role="status">
          {message.type === "success" ? <IconCheckCircle size={16} /> : <IconAlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-card-label"><IconFileText size={15} /> Phases</div><div className="stat-card-value accent-primary">{phases.length}</div></div>
        <div className="stat-card"><div className="stat-card-label"><IconCalendar size={15} /> Days</div><div className="stat-card-value accent-blue">{totalDays}</div></div>
        <div className="stat-card"><div className="stat-card-label"><IconUsers size={15} /> Learning owners</div><div className="stat-card-value accent-purple">{organisers.length}</div></div>
        <div className="stat-card"><div className="stat-card-label"><IconClock size={15} /> Open now</div><div className="stat-card-value accent-green">{phases.flatMap((phase) => phase.days).filter((day) => getDayAccessState(day) === "open").length}</div></div>
      </div>

      <div className="program-stack">
        {phases.map((phase) => {
          const expanded = expandedPhase === phase.id;
          return (
            <section className="card program-phase-card" key={phase.id}>
              <button className="program-phase-header" onClick={() => setExpandedPhase(expanded ? null : phase.id)}>
                <span className="program-phase-number">{String(phase.order).padStart(2, "0")}</span>
                <span className="program-phase-copy">
                  <strong>{phase.title}</strong>
                  <small>{phase.description || "No phase description"} · {phase.days.length} days</small>
                </span>
                <span className={`program-chevron ${expanded ? "open" : ""}`}><IconChevronDown size={17} /></span>
              </button>
              {expanded && (
                <div className="program-days">
                  {phase.days.map((day) => {
                    const access = getDayAccessState(day);
                    return (
                      <article className="program-day-row" key={day.id}>
                        <div className="program-day-icon"><DayTypeIcon type={day.type} size={18} /></div>
                        <div className="program-day-main">
                          <div className="program-day-title">
                            <strong>Day {day.order}: {day.title}</strong>
                            <span className={`badge ${TYPE_BADGE[day.type]}`}>{day.type}</span>
                            <span className={`badge ${access === "open" ? "badge-green" : access === "upcoming" ? "badge-blue" : "badge-primary"}`}>{access}</span>
                          </div>
                          <p>{day.description || "No description"}</p>
                          <div className="program-day-meta">
                            <span><IconClock size={13} /> {formatWindow(day)}</span>
                            {day.learningConfig?.organiserName && <span><IconUsers size={13} /> {day.learningConfig.organiserName}</span>}
                            {day.learningConfig?.meetLink && <a href={day.learningConfig.meetLink} target="_blank" rel="noreferrer"><IconExternalLink size={13} /> Meet</a>}
                          </div>
                        </div>
                        <div className="program-day-actions">
                          <button className="btn btn-ghost icon-button" aria-label={`Edit ${day.title}`} onClick={() => openDayModal(phase.id, day)}><IconEdit size={16} /></button>
                          <button className="btn btn-ghost icon-button danger" aria-label={`Delete ${day.title}`} onClick={() => deleteDay(day)}><IconTrash size={16} /></button>
                        </div>
                      </article>
                    );
                  })}
                  {phase.days.length === 0 && <div className="empty-state"><div className="empty-state-title">No days yet</div><div className="empty-state-text">Add the first scheduled activity for this phase.</div></div>}
                  <button className="btn btn-secondary" onClick={() => openDayModal(phase.id)}><IconPlus size={14} /> Add Day</button>
                </div>
              )}
            </section>
          );
        })}
        {phases.length === 0 && <div className="card empty-state"><div className="empty-state-title">Build the first phase</div><div className="empty-state-text">Program days will appear here after a phase is created.</div></div>}
      </div>

      {phaseModal && (
        <div className="modal-overlay" onClick={() => setPhaseModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Create Phase</h2><button className="modal-close" onClick={() => setPhaseModal(false)}><IconClose size={17} /></button></div>
            <div className="input-group"><label className="input-label">Title</label><input className="input" value={phaseTitle} onChange={(event) => setPhaseTitle(event.target.value)} /></div>
            <div className="input-group"><label className="input-label">Description</label><textarea className="input" rows={3} value={phaseDescription} onChange={(event) => setPhaseDescription(event.target.value)} /></div>
            <div className="modal-actions"><button className="btn btn-primary" disabled={saving || !phaseTitle.trim()} onClick={createPhase}>{saving ? "Creating..." : "Create Phase"}</button><button className="btn btn-ghost" onClick={() => setPhaseModal(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {dayModal && (
        <div className="modal-overlay" onClick={() => setDayModal(null)}>
          <div className="modal modal-wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2 className="modal-title">{dayModal.day ? "Edit Day" : "Create Day"}</h2><p className="modal-subtitle">Times are stored precisely and shown in the selected timezone.</p></div><button className="modal-close" onClick={() => setDayModal(null)}><IconClose size={17} /></button></div>
            <div className="form-grid">
              <div className="input-group"><label className="input-label">Title</label><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
              <div className="input-group"><label className="input-label">Day type</label><select className="input select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as DayType, questions: [] })}><option value="learning">Learning session</option><option value="task">Task / assignment</option><option value="test">Timed test</option><option value="interview">One-to-one interview</option></select></div>
              <div className="input-group form-grid-full"><label className="input-label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
              <div className="input-group"><label className="input-label">Starts at</label><input type="datetime-local" className="input" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></div>
              <div className="input-group"><label className="input-label">Ends at</label><input type="datetime-local" className="input" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></div>
              <div className="input-group"><label className="input-label">Timezone</label><select className="input select" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })}><option value="Asia/Kolkata">India Standard Time</option><option value="UTC">UTC</option></select></div>
              <label className="toggle-row"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /><span>Published and visible to students</span></label>
            </div>

            {form.type === "learning" && (
              <div className="config-panel">
                <h3><IconVideo size={17} /> Learning session</h3>
                <div className="form-grid">
                  <div className="input-group"><label className="input-label">Assigned organiser</label><select className="input select" value={form.organiserId} onChange={(event) => setForm({ ...form, organiserId: event.target.value })}><option value="">Unassigned</option>{organisers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="input-group"><label className="input-label">Google Meet link</label><div className="input-action-row"><input className="input" value={form.meetLink} onChange={(event) => setForm({ ...form, meetLink: event.target.value })} placeholder="Paste a Meet link or generate one" /><button className="btn btn-secondary" disabled={generatingMeet} onClick={generateMeet}>{generatingMeet ? "Generating..." : "Generate"}</button></div></div>
                </div>
              </div>
            )}

            {form.type === "task" && (
              <div className="config-panel">
                <h3><IconFileText size={17} /> Task configuration</h3>
                <div className="form-grid">
                  <div className="input-group"><label className="input-label">Submission type</label><select className="input select" value={form.submissionType} onChange={(event) => setForm({ ...form, submissionType: event.target.value as DayForm["submissionType"] })}><option value="link">Link</option><option value="file">File</option><option value="video">Video</option><option value="text">Text response</option></select></div>
                  <div className="input-group"><label className="input-label">Maximum points</label><input type="number" min={1} className="input" value={form.maxPoints} onChange={(event) => setForm({ ...form, maxPoints: Number(event.target.value) })} /></div>
                  <div className="input-group form-grid-full"><label className="input-label">Instructions</label><textarea className="input" rows={4} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></div>
                </div>
                <QuestionBuilder questions={form.questions} testMode={false} onAdd={addQuestion} onUpdate={updateQuestion} onRemove={(index) => setForm({ ...form, questions: form.questions.filter((_, itemIndex) => itemIndex !== index) })} />
              </div>
            )}

            {form.type === "test" && (
              <div className="config-panel">
                <h3><IconAlertTriangle size={17} /> Exam configuration</h3>
                <div className="form-grid">
                  <div className="input-group"><label className="input-label">Time limit (minutes)</label><input type="number" min={1} className="input" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></div>
                  <div className="input-group"><label className="input-label">Warning limit</label><input type="number" min={1} className="input" value={form.warningLimit} onChange={(event) => setForm({ ...form, warningLimit: Number(event.target.value) })} /></div>
                  <label className="toggle-row"><input type="checkbox" checked={form.cameraRequired} onChange={(event) => setForm({ ...form, cameraRequired: event.target.checked })} /><span>Require camera recording</span></label>
                  <label className="toggle-row"><input type="checkbox" checked={form.monitoringEnabled} onChange={(event) => setForm({ ...form, monitoringEnabled: event.target.checked })} /><span>Record browser warnings</span></label>
                  <label className="toggle-row"><input type="checkbox" checked={form.shuffleQuestions} onChange={(event) => setForm({ ...form, shuffleQuestions: event.target.checked })} /><span>Shuffle question order</span></label>
                  <label className="toggle-row"><input type="checkbox" checked={form.allowBackNavigation} onChange={(event) => setForm({ ...form, allowBackNavigation: event.target.checked })} /><span>Allow previous question</span></label>
                </div>
                <QuestionBuilder questions={form.questions} testMode onAdd={addQuestion} onUpdate={updateQuestion} onRemove={(index) => setForm({ ...form, questions: form.questions.filter((_, itemIndex) => itemIndex !== index) })} />
              </div>
            )}

            {form.type === "interview" && (
              <div className="config-panel">
                <h3><IconUsers size={17} /> Interview configuration</h3>
                <div className="form-grid">
                  <div className="input-group"><label className="input-label">Interview type</label><select className="input select" value={form.interviewType} onChange={(event) => setForm({ ...form, interviewType: event.target.value as DayForm["interviewType"] })}><option value="technical">Technical</option><option value="hr">HR</option><option value="mixed">Mixed</option></select></div>
                  <div className="input-group"><label className="input-label">Slot duration (minutes)</label><input type="number" min={5} className="input" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></div>
                  <div className="input-group"><label className="input-label">Default volunteer</label><select className="input select" value={form.defaultVolunteerId} onChange={(event) => setForm({ ...form, defaultVolunteerId: event.target.value })}><option value="">Assign per student later</option>{volunteers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                </div>
              </div>
            )}

            <div className="modal-actions sticky-actions"><button className="btn btn-primary" disabled={saving || !form.title.trim()} onClick={saveDay}>{saving ? "Saving..." : dayModal.day ? "Save Changes" : "Create Day"}</button><button className="btn btn-ghost" onClick={() => setDayModal(null)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionBuilder({
  questions,
  testMode,
  onAdd,
  onUpdate,
  onRemove,
}: {
  questions: ProgramQuestion[];
  testMode: boolean;
  onAdd: (type: "mcq" | "text") => void;
  onUpdate: (index: number, patch: Partial<ProgramQuestion>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="question-builder">
      <div className="question-builder-header"><div><strong>Questions</strong><small>{testMode ? "MCQs are graded on the server. Text answers go to review." : "Add optional MCQ or written prompts to the task."}</small></div><div className="question-add-actions"><button className="btn btn-secondary" onClick={() => onAdd("mcq")}><IconPlus size={13} /> MCQ</button><button className="btn btn-secondary" onClick={() => onAdd("text")}><IconPlus size={13} /> Text</button></div></div>
      {questions.map((question, index) => (
        <div className="question-editor" key={question.id}>
          <div className="question-editor-top"><span className="badge badge-primary">Question {index + 1} · {question.type.toUpperCase()}</span><button className="btn btn-ghost icon-button danger" onClick={() => onRemove(index)}><IconTrash size={15} /></button></div>
          <textarea className="input" rows={2} placeholder="Question prompt" value={question.prompt} onChange={(event) => onUpdate(index, { prompt: event.target.value })} />
          <div className="question-points"><label className="input-label">Points</label><input className="input" type="number" min={0} value={question.points} onChange={(event) => onUpdate(index, { points: Number(event.target.value) })} /></div>
          {question.type === "mcq" && (
            <div className="question-options">
              {(question.options || []).map((option, optionIndex) => (
                <label className="question-option-editor" key={optionIndex}>
                  {testMode && <input type="radio" name={`correct-${question.id}`} checked={question.correctOption === optionIndex} onChange={() => onUpdate(index, { correctOption: optionIndex })} />}
                  <input className="input" placeholder={`Option ${optionIndex + 1}`} value={option} onChange={(event) => { const options = [...(question.options || [])]; options[optionIndex] = event.target.value; onUpdate(index, { options }); }} />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      {questions.length === 0 && <div className="question-empty">No questions added.</div>}
    </div>
  );
}
