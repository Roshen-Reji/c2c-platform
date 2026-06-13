"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authenticatedFetch, authenticatedJson } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
  InterviewSlot,
  MonitoringEvent,
  ProgramDay,
  ProgramQuestion,
} from "@/lib/program-types";
import ExamCamera, { type ExamCameraHandle } from "@/components/ExamCamera";
import {
  DayTypeIcon,
  IconAlertTriangle,
  IconArrowRight,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconMessageCircle,
  IconPlay,
  IconSend,
  IconShield,
  IconUsers,
  IconVideo,
} from "@/components/SvgIcons";

const VideoRecorder = dynamic(() => import("@/components/VideoRecorder"), { ssr: false });
const JitsiMeeting = dynamic(() => import("@/components/JitsiMeeting"), { ssr: false });

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  role: string;
}

interface DayResponse {
  day: ProgramDay;
  accessState: "draft" | "invalid" | "upcoming" | "closed" | "open";
  serverNow: string;
  interviewSlot: InterviewSlot | null;
}

interface AttemptResponse {
  attempt: {
    attemptId: string;
    deadlineAt: string;
    answers: Record<string, string>;
    warningEvents: MonitoringEvent[];
    questions: ProgramQuestion[];
  };
  serverNow: string;
}

export default function StudentDayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const dayId = String(params.dayId);
  const phaseId = searchParams.get("phaseId") || "";
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [accessState, setAccessState] = useState<DayResponse["accessState"]>("invalid");
  const [slot, setSlot] = useState<InterviewSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phaseId) return;
    authenticatedJson<DayResponse>(`/api/days/${phaseId}/${dayId}`)
      .then((result) => {
        setDay(result.day);
        setAccessState(result.accessState);
        setSlot(result.interviewSlot);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the day."))
      .finally(() => setLoading(false));
  }, [dayId, phaseId]);

  if (!phaseId) return <div className="card empty-state"><IconAlertTriangle size={42} /><div className="empty-state-title">Day link incomplete</div><div className="empty-state-text">Return to the roadmap and open this day again.</div></div>;
  if (loading) return <div className="day-loading"><div className="spinner" /></div>;
  if (error || !day) return <div className="card empty-state"><IconAlertTriangle size={42} /><div className="empty-state-title">Day unavailable</div><div className="empty-state-text">{error || "The day could not be found."}</div></div>;

  return (
    <div>
      <DayHeader day={day} accessState={accessState} />
      {accessState !== "open" && <AvailabilityPanel day={day} state={accessState} />}
      {accessState === "open" && day.type === "learning" && <LearningDay day={day} />}
      {accessState === "open" && day.type === "task" && <TaskDay day={day} profile={profile} />}
      {accessState === "open" && day.type === "test" && <TestDay day={day} profile={profile} />}
      {accessState === "open" && day.type === "interview" && <InterviewDay day={day} slot={slot} displayName={profile?.fullName || "Student"} />}
    </div>
  );
}

function DayHeader({ day, accessState }: { day: ProgramDay; accessState: DayResponse["accessState"] }) {
  return (
    <>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">{day.title}</h1>
          <div className="day-heading-meta">
            <span className={`badge ${day.type === "learning" ? "badge-blue" : day.type === "task" ? "badge-green" : day.type === "test" ? "badge-orange" : "badge-purple"}`}><DayTypeIcon type={day.type} size={12} /> {day.type}</span>
            <span className={`badge ${accessState === "open" ? "badge-green" : "badge-primary"}`}>{accessState}</span>
          </div>
        </div>
      </div>
      <div className="card day-overview">
        <p>{day.description || "No description has been provided."}</p>
        <div className="program-day-meta">
          <span><IconClock size={14} /> Starts {formatDate(day.startsAt, day.timezone)}</span>
          <span><IconClock size={14} /> Ends {formatDate(day.endsAt, day.timezone)}</span>
        </div>
      </div>
    </>
  );
}

function AvailabilityPanel({ day, state }: { day: ProgramDay; state: DayResponse["accessState"] }) {
  const copy =
    state === "upcoming"
      ? `This day opens on ${formatDate(day.startsAt, day.timezone)}.`
      : state === "closed"
        ? `This day closed on ${formatDate(day.endsAt, day.timezone)}.`
        : "This day is not currently available.";
  return <div className="card availability-panel"><IconClock size={42} /><h2>{state === "upcoming" ? "Not open yet" : state === "closed" ? "Day closed" : "Unavailable"}</h2><p>{copy}</p></div>;
}

function LearningDay({ day }: { day: ProgramDay }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const messagesQuery = query(collection(db, "chat", day.id, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ChatMessage, "id">) })));
    });
  }, [day.id]);

  async function send() {
    if (!profile || !text.trim()) return;
    await addDoc(collection(db, "chat", day.id, "messages"), {
      senderId: profile.uid,
      senderName: profile.fullName,
      role: profile.role,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
    setText("");
  }

  return (
    <div className="learning-layout">
      <div className="day-content-stack">
        <article className="card session-hero">
          <div className="session-hero-icon"><IconVideo size={28} /></div>
          <div><span className="eyebrow">Live learning session</span><h2>{day.learningConfig?.organiserName || "Organiser to be confirmed"}</h2><p>{formatDate(day.startsAt, day.timezone)} to {formatTime(day.endsAt, day.timezone)}</p></div>
          {day.learningConfig?.meetLink ? <a className="btn btn-primary" href={day.learningConfig.meetLink} target="_blank" rel="noreferrer"><IconExternalLink size={15} /> Join Google Meet</a> : <span className="badge badge-orange">Meet link pending</span>}
        </article>
        {day.learningConfig?.youtubeVideos?.map((url) => <div className="card video-resource" key={url}><iframe src={url} title="Learning resource" allowFullScreen /></div>)}
        {day.learningConfig?.materials && day.learningConfig.materials.length > 0 && <div className="card"><h3 className="section-title"><IconFileText size={17} /> Materials</h3>{day.learningConfig.materials.map((material) => <a className="resource-link" href={material.url} target="_blank" rel="noreferrer" key={material.url}><IconExternalLink size={14} /> {material.title}<span className="badge badge-primary">{material.type}</span></a>)}</div>}
      </div>
      <aside className="card chat-panel">
        <h3><IconMessageCircle size={17} /> Session chat</h3>
        <div className="chat-messages">{messages.map((message) => <div className={`chat-message ${message.senderId === profile?.uid ? "mine" : ""}`} key={message.id}><strong>{message.senderName}</strong><p>{message.text}</p></div>)}{messages.length === 0 && <div className="question-empty">No messages yet.</div>}</div>
        <div className="chat-compose"><input className="input" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void send()} placeholder="Ask a question..." /><button className="btn btn-primary icon-button" onClick={() => void send()}><IconSend size={15} /></button></div>
      </aside>
    </div>
  );
}

function TaskDay({ day, profile }: { day: ProgramDay; profile: ReturnType<typeof useAuth>["profile"] }) {
  const config = day.taskConfig!;
  const [content, setContent] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [video, setVideo] = useState<Blob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [error, setError] = useState("");

  async function upload(blob: Blob, fileName: string) {
    if (!profile) throw new Error("Sign in again before uploading.");
    const form = new FormData();
    form.append("file", blob, fileName);
    form.append("userEmail", profile.email);
    form.append("dayId", day.id);
    const response = await authenticatedFetch("/api/upload-drive", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Upload failed.");
    return result.url as string;
  }

  async function submit() {
    setStatus("submitting");
    setError("");
    try {
      let submissionContent = content.trim();
      if (config.submissionType === "file" && file) submissionContent = await upload(file, file.name);
      if (config.submissionType === "video" && video) submissionContent = await upload(video, "task-video.webm");
      await authenticatedJson("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: day.phaseId, dayId: day.id, content: submissionContent, answers }),
      });
      setStatus("submitted");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the task.");
      setStatus("idle");
    }
  }

  if (status === "submitted") return <div className="card success-state"><IconCheckCircle size={48} /><h2>Task submitted</h2><p>Your volunteer can now review and score it.</p></div>;

  return (
    <div className="day-content-stack">
      <div className="card"><h2 className="section-title">Instructions</h2><p className="preserve-lines">{config.instructions || "Complete the task and submit before the day closes."}</p><div className="day-heading-meta"><span className="badge badge-primary">Max {config.maxPoints} points</span><span className="badge badge-blue">{config.submissionType} submission</span></div></div>
      {config.questions.length > 0 && <QuestionList questions={config.questions} answers={answers} onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))} />}
      <div className="card">
        <h2 className="section-title">Your submission</h2>
        {config.submissionType === "link" && <input className="input" value={content} onChange={(event) => setContent(event.target.value)} placeholder="https://..." />}
        {config.submissionType === "text" && <textarea className="input" rows={8} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write your response..." />}
        {config.submissionType === "file" && <input className="input" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />}
        {config.submissionType === "video" && <VideoRecorder onRecordingComplete={setVideo} maxDurationSeconds={300} />}
        {error && <div className="portal-notice error">{error}</div>}
        <button className="btn btn-primary btn-large w-full" onClick={() => void submit()} disabled={status === "submitting" || (config.submissionType === "link" && !content.trim()) || (config.submissionType === "text" && !content.trim()) || (config.submissionType === "file" && !file) || (config.submissionType === "video" && !video)}>{status === "submitting" ? "Submitting..." : <><IconCheckCircle size={15} /> Submit Task</>}</button>
      </div>
    </div>
  );
}

function TestDay({ day, profile }: { day: ProgramDay; profile: ReturnType<typeof useAuth>["profile"] }) {
  const config = day.testConfig!;
  const cameraRef = useRef<ExamCameraHandle>(null);
  const [cameraReady, setCameraReady] = useState(!config.cameraRequired);
  const [attempt, setAttempt] = useState<AttemptResponse["attempt"] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<MonitoringEvent[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; status: string } | null>(null);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const recordWarning = useCallback((type: MonitoringEvent["type"]) => {
    setWarnings((current) => [...current, { type, occurredAt: new Date().toISOString(), questionId: attempt?.questions[questionIndex]?.id }]);
  }, [attempt, questionIndex]);

  useEffect(() => {
    if (!attempt) return;
    const onVisibility = () => document.hidden && recordWarning("tab_hidden");
    const onBlur = () => recordWarning("window_blur");
    const onFullscreen = () => !document.fullscreenElement && recordWarning("fullscreen_exit");
    const onCopy = (event: ClipboardEvent) => { event.preventDefault(); recordWarning("copy"); };
    const onPaste = (event: ClipboardEvent) => { event.preventDefault(); recordWarning("paste"); };
    const onContext = (event: MouseEvent) => { event.preventDefault(); recordWarning("context_menu"); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [attempt, recordWarning]);

  useEffect(() => {
    if (!attempt) return;
    function tick() {
      const seconds = Math.max(0, Math.ceil((new Date(attempt!.deadlineAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
    }
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [attempt]);

  useEffect(() => {
    if (attempt && remaining === 0 && !submittingRef.current) void submit();
    // submit intentionally reads the latest attempt state when the timer reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, remaining]);

  useEffect(() => {
    if (!attempt) return;
    const timeout = window.setTimeout(() => {
      void authenticatedJson(`/api/exams/${day.phaseId}/${day.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "autosave", answers, warningEvents: warnings }),
      }).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [answers, attempt, day.id, day.phaseId, warnings]);

  async function start() {
    if (config.cameraRequired && !cameraReady) return;
    setError("");
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => undefined);
      const response = await authenticatedJson<AttemptResponse>(`/api/exams/${day.phaseId}/${day.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      setAttempt(response.attempt);
      setAnswers(response.attempt.answers || {});
      setWarnings(response.attempt.warningEvents || []);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start the test.");
    }
  }

  async function uploadRecording(blob: Blob | null) {
    if (!blob || !profile) return "";
    const form = new FormData();
    form.append("file", blob, "exam-monitoring.webm");
    form.append("userEmail", profile.email);
    form.append("dayId", day.id);
    const response = await authenticatedFetch("/api/upload-drive", { method: "POST", body: form });
    const resultData = await response.json();
    if (!response.ok) throw new Error(resultData.error || "Could not upload the monitoring video.");
    return resultData.url as string;
  }

  async function submit() {
    if (!attempt || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const recording = await cameraRef.current?.stop();
      const cameraRecordingUrl = await uploadRecording(recording || null);
      const response = await authenticatedJson<{ score: number; maxScore: number; status: string }>(`/api/exams/${day.phaseId}/${day.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", answers, warningEvents: warnings, cameraRecordingUrl }),
      });
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setResult(response);
      setAttempt(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the test.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (result) return <div className="card success-state"><IconCheckCircle size={52} /><h2>Test submitted</h2><p>{result.status === "graded" ? `MCQ score: ${result.score} / ${result.maxScore}` : `MCQ score: ${result.score} / ${result.maxScore}. Written answers are awaiting review.`}</p><span className="badge badge-orange">{warnings.length} monitoring events recorded</span></div>;

  if (!attempt) {
    return (
      <div className="exam-launch-layout">
        <div className="card exam-brief">
          <IconShield size={48} color="var(--accent-primary)" />
          <h2>Exam readiness check</h2>
          <div className="exam-facts"><span><IconClock size={16} /> {config.durationMinutes} minutes</span><span><IconFileText size={16} /> {config.questions.length} questions</span><span><IconAlertTriangle size={16} /> Warning limit: {config.warningLimit}</span></div>
          <ul><li>The timer is enforced by the server and cannot exceed the day closing time.</li><li>Leaving fullscreen, switching tabs, copy/paste, right-click, and window blur are logged.</li><li>Monitoring events are evidence for review, not automatic proof of misconduct.</li></ul>
          {error && <div className="portal-notice error">{error}</div>}
          <button className="btn btn-primary btn-large" disabled={!cameraReady} onClick={() => void start()}><IconPlay size={16} /> Start Test</button>
        </div>
        <div className="card"><ExamCamera ref={cameraRef} active={Boolean(attempt)} required={config.cameraRequired} onReadyChange={setCameraReady} /></div>
      </div>
    );
  }

  const question = attempt.questions[questionIndex];
  const answered = Object.values(answers).filter((value) => value.trim()).length;
  return (
    <div className="exam-shell">
      <aside className="card exam-sidebar">
        <ExamCamera ref={cameraRef} active required={config.cameraRequired} onReadyChange={setCameraReady} />
        <div className={`exam-timer ${remaining < 60 ? "danger" : ""}`}><IconClock size={20} /> {formatCountdown(remaining)}</div>
        <div className="exam-progress"><strong>{answered} / {attempt.questions.length}</strong><span>answered</span></div>
        <div className="exam-warning-count"><IconAlertTriangle size={16} /><strong>{warnings.length}</strong><span>events</span></div>
        <div className="question-palette">{attempt.questions.map((item, index) => <button className={`${index === questionIndex ? "active" : ""} ${answers[item.id] ? "answered" : ""}`} key={item.id} onClick={() => setQuestionIndex(index)}>{index + 1}</button>)}</div>
      </aside>
      <main className="card exam-question-card">
        {warnings.length >= config.warningLimit && <div className="portal-notice error"><IconAlertTriangle size={16} /> You have reached the configured warning threshold. Continue carefully; all events are included with your submission.</div>}
        <div className="exam-question-heading"><span>Question {questionIndex + 1} of {attempt.questions.length}</span><span>{question.points} points</span></div>
        <h2>{question.prompt}</h2>
        <QuestionInput question={question} value={answers[question.id] || ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />
        <div className="exam-navigation">
          <button className="btn btn-secondary" disabled={questionIndex === 0 || !config.allowBackNavigation} onClick={() => setQuestionIndex((index) => index - 1)}><IconChevronLeft size={14} /> Previous</button>
          {questionIndex < attempt.questions.length - 1 ? <button className="btn btn-primary" onClick={() => setQuestionIndex((index) => index + 1)}>Next <IconChevronRight size={14} /></button> : <button className="btn btn-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? "Submitting..." : <><IconCheckCircle size={14} /> Submit Test</>}</button>}
        </div>
      </main>
    </div>
  );
}

function InterviewDay({ day, slot, displayName }: { day: ProgramDay; slot: InterviewSlot | null; displayName: string }) {
  const [joined, setJoined] = useState(false);
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
  if (!slot) return <div className="card availability-panel"><IconUsers size={46} /><h2>Interview slot not assigned</h2><p>Your volunteer and meeting time will appear here after the admin schedules them.</p></div>;
  const joinable = now >= new Date(slot.startsAt).getTime() - 10 * 60_000 && now <= new Date(slot.endsAt).getTime() + 15 * 60_000;
  if (joined) return <div className="meeting-page-shell"><JitsiMeeting roomName={slot.roomName} displayName={displayName} onClose={() => setJoined(false)} /></div>;
  return <div className="card interview-card"><div className="interview-icon"><IconVideo size={34} /></div><span className="eyebrow">{day.interviewConfig?.interviewType || "Mixed"} interview</span><h2>Your one-to-one meeting</h2><p>Your assigned volunteer is <strong>{slot.volunteerName}</strong>.</p><div className="interview-schedule"><span><IconClock size={16} /> {formatDate(slot.startsAt, slot.timezone)}</span><span><IconArrowRight size={15} /> {formatTime(slot.endsAt, slot.timezone)}</span></div><button className="btn btn-primary btn-large" disabled={!joinable} onClick={() => setJoined(true)}><IconVideo size={16} /> {joinable ? "Join Interview Room" : "Room opens 10 minutes before"}</button></div>;
}

function QuestionList({ questions, answers, onAnswer }: { questions: ProgramQuestion[]; answers: Record<string, string>; onAnswer: (id: string, value: string) => void }) {
  return <div className="day-content-stack">{questions.map((question, index) => <div className="card" key={question.id}><div className="exam-question-heading"><span>Question {index + 1}</span><span>{question.points} points</span></div><h3 className="task-question-title">{question.prompt}</h3><QuestionInput question={question} value={answers[question.id] || ""} onChange={(value) => onAnswer(question.id, value)} /></div>)}</div>;
}

function QuestionInput({ question, value, onChange }: { question: ProgramQuestion; value: string; onChange: (value: string) => void }) {
  if (question.type === "text") return <textarea className="input exam-text-answer" rows={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write your answer..." />;
  return <div className="exam-options">{question.options?.map((option, index) => <label className={value === String(index) ? "selected" : ""} key={`${question.id}-${index}`}><input type="radio" name={question.id} checked={value === String(index)} onChange={() => onChange(String(index))} /><span className="exam-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span></label>)}</div>;
}

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timeZone || "Asia/Kolkata" }).format(new Date(value));
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: timeZone || "Asia/Kolkata" }).format(new Date(value));
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
