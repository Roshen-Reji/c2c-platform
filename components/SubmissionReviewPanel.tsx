"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedJson } from "@/lib/api-client";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconExternalLink,
  IconFileText,
  IconUsers,
} from "@/components/SvgIcons";

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  dayId: string;
  dayTitle: string;
  type: "task" | "test";
  content?: string;
  answers?: Record<string, string>;
  submittedAt: string;
  points: number;
  maxPoints: number;
  status: string;
  warningCount?: number;
  warningEvents?: { type: string; occurredAt: string }[];
  cameraRecordingUrl?: string;
  feedback?: string;
}

export default function SubmissionReviewPanel({ title, subtitle }: { title: string; subtitle: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [points, setPoints] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    authenticatedJson<{ submissions: Submission[] }>("/api/reviews")
      .then((result) => setSubmissions(result.submissions))
      .finally(() => setLoading(false));
  }, []);

  const pending = useMemo(
    () => submissions.filter((submission) => !["approved", "graded"].includes(submission.status)).length,
    [submissions],
  );

  function open(submission: Submission) {
    setSelected(submission);
    setPoints(submission.points || 0);
    setFeedback(submission.feedback || "");
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await authenticatedJson<{ points: number }>("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: selected.id, points, feedback }),
      });
      setSubmissions((current) => current.map((submission) => submission.id === selected.id ? { ...submission, points: result.points, feedback, status: "approved" } : submission));
      setSelected(null);
      setMessage("Review saved and student points updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="portal-header"><div><h1 className="portal-page-title">{title}</h1><p className="portal-page-subtitle">{subtitle}</p></div></div>
      {message && <div className="portal-notice success"><IconCheckCircle size={15} /> {message}</div>}
      <div className="stats-grid"><div className="stat-card"><div className="stat-card-label"><IconFileText size={15} /> Submissions</div><div className="stat-card-value accent-blue">{submissions.length}</div></div><div className="stat-card"><div className="stat-card-label"><IconAlertTriangle size={15} /> Pending review</div><div className="stat-card-value accent-orange">{pending}</div></div><div className="stat-card"><div className="stat-card-label"><IconCheckCircle size={15} /> Completed</div><div className="stat-card-value accent-green">{submissions.length - pending}</div></div></div>
      {loading ? <div className="card empty-state"><div className="spinner" /></div> : submissions.length === 0 ? <div className="card empty-state"><IconUsers size={38} /><div className="empty-state-title">No assigned submissions</div><div className="empty-state-text">Submissions from your assigned students or days will appear here.</div></div> : <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Student</th><th>Day</th><th>Type</th><th>Status</th><th>Score</th><th /></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td>{submission.studentName || submission.studentId}</td><td>{submission.dayTitle || submission.dayId}</td><td><span className={`badge ${submission.type === "test" ? "badge-orange" : "badge-green"}`}>{submission.type}</span></td><td>{submission.status}</td><td>{submission.points || 0} / {submission.maxPoints || 0}</td><td style={{ textAlign: "right" }}><button className="btn btn-secondary" onClick={() => open(submission)}>Review</button></td></tr>)}</tbody></table></div>}
      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal modal-wide" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><h2 className="modal-title">{selected.studentName}</h2><p className="modal-subtitle">{selected.dayTitle} · {selected.type}</p></div><button className="modal-close" onClick={() => setSelected(null)}>Close</button></div><div className="review-detail-grid"><div className="review-content"><h3>Submission</h3>{selected.content ? selected.content.startsWith("http") ? <a className="resource-link" href={selected.content} target="_blank" rel="noreferrer"><IconExternalLink size={14} /> Open submitted content</a> : <p className="preserve-lines">{selected.content}</p> : <p className="question-empty">No separate file or link.</p>}{selected.answers && Object.entries(selected.answers).map(([id, answer]) => <div className="review-answer" key={id}><strong>{id}</strong><p>{answer || "No answer"}</p></div>)}{selected.cameraRecordingUrl && <a className="resource-link" href={selected.cameraRecordingUrl} target="_blank" rel="noreferrer"><IconExternalLink size={14} /> Open monitoring video</a>}{selected.warningCount ? <div className="portal-notice error"><IconAlertTriangle size={15} /> {selected.warningCount} browser monitoring events</div> : null}</div><div className="review-score"><div className="input-group"><label className="input-label">Points out of {selected.maxPoints}</label><input className="input" type="number" min={0} max={selected.maxPoints} value={points} onChange={(event) => setPoints(Number(event.target.value))} /></div><div className="input-group"><label className="input-label">Feedback</label><textarea className="input" rows={8} value={feedback} onChange={(event) => setFeedback(event.target.value)} /></div><button className="btn btn-primary w-full" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Approve and Save Score"}</button></div></div></div></div>}
    </div>
  );
}
