"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { doc, getDoc, collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  IconBook,
  IconPencil,
  IconFileText,
  IconMic,
  IconVideo,
  IconSend,
  IconExternalLink,
  IconClock,
  IconAlertTriangle,
  IconCheckCircle,
  IconPlay,
  IconLiveDot,
  IconChevronLeft,
  IconChevronRight,
  IconMessageCircle,
  IconArrowRight,
  DayTypeIcon,
} from "@/components/SvgIcons";

const VideoRecorder = dynamic(() => import("@/components/VideoRecorder"), { ssr: false });
const JitsiMeeting = dynamic(() => import("@/components/JitsiMeeting"), { ssr: false });

interface DayData {
  title: string;
  type: "learning" | "task" | "test" | "interview";
  description: string;
  meetLink?: string;
  meetTime?: string;
  materials?: { title: string; url: string; type: string }[];
  youtubeVideos?: string[];
  taskConfig?: {
    submissionType: "link" | "file" | "video";
    instructions: string;
    maxRecordings?: number;
    maxPoints: number;
  };
  testConfig?: {
    questions: {
      type: "mcq" | "text";
      question: string;
      options?: string[];
      points: number;
    }[];
    duration: number;
    monitoringEnabled: boolean;
  };
  interviewConfig?: {
    type: "technical" | "hr";
    durationMinutes: number;
  };
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  role: string;
}

// Fallback data removed. System will now show an error or blank if day is not found.

export default function DayPage() {
  const params = useParams();
  const dayId = params.dayId as string;
  const { profile } = useAuth();

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Task submission
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [fileBlob, setFileBlob] = useState<File | null>(null);

  // Interview state
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Test state
  const [testStarted, setTestStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Load day data
  useEffect(() => {
    async function loadDay() {
      try {
        const phases = await getDoc(doc(db, "phases", "phase-1"));
        if (phases.exists()) {
          const dayDoc = await getDoc(doc(db, "phases", "phase-1", "days", dayId));
          if (dayDoc.exists()) {
            setDayData(dayDoc.data() as DayData);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to load day:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDay();
  }, [dayId]);

  // Chat real-time listener
  useEffect(() => {
    if (!dayData || dayData.type !== "learning") return;
    try {
      const chatRef = collection(db, "chat", dayId, "messages");
      const q = query(chatRef, orderBy("timestamp", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, "id">),
          timestamp: d.data().timestamp?.toDate() || new Date(),
        }));
        setChatMessages(messages);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });
      return () => unsubscribe();
    } catch {
      // Chat won't work without Firebase
    }
  }, [dayData, dayId]);

  // Tab switch detection for tests
  useEffect(() => {
    if (!testStarted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [testStarted]);

  // Test timer
  useEffect(() => {
    if (!testStarted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // Clipboard blocking for tests
  useEffect(() => {
    if (!testStarted) return;
    const block = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("paste", block);
    document.addEventListener("copy", block);
    return () => {
      document.removeEventListener("paste", block);
      document.removeEventListener("copy", block);
    };
  }, [testStarted]);

  // Right-click blocking for tests
  useEffect(() => {
    if (!testStarted) return;
    const blockContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", blockContext);
    return () => document.removeEventListener("contextmenu", blockContext);
  }, [testStarted]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !profile) return;
    try {
      const chatRef = collection(db, "chat", dayId, "messages");
      await addDoc(chatRef, {
        senderId: profile.uid,
        senderName: profile.fullName,
        text: chatInput.trim(),
        timestamp: serverTimestamp(),
        role: profile.role,
      });
      setChatInput("");
    } catch {
      console.warn("Chat not available without Firebase config");
    }
  };

  const handleTaskSubmit = async () => {
    if (!profile) return;
    const isVideo = dayData?.taskConfig?.submissionType === "video";
    const isFile = dayData?.taskConfig?.submissionType === "file";
    const isLink = dayData?.taskConfig?.submissionType === "link";
    
    if (isLink && !submissionLink.trim()) return;
    if (isVideo && !videoBlob) return;
    if (isFile && !fileBlob) return;

    setSubmissionStatus("submitting");
    let contentUrl = submissionLink.trim();

    if ((isVideo && videoBlob) || (isFile && fileBlob)) {
      try {
        const formData = new FormData();
        if (isVideo && videoBlob) {
          formData.append("file", videoBlob, "video.webm");
        } else if (isFile && fileBlob) {
          formData.append("file", fileBlob, fileBlob.name);
        }
        formData.append("userEmail", profile.email);
        formData.append("dayId", dayId);

        const res = await fetch("/api/upload-drive", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          contentUrl = data.url;
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.warn("Upload to Drive failed:", err);
        contentUrl = `[${isVideo ? "Video" : "File"} recorded - upload failed]`;
      }
    }

    try {
      await addDoc(collection(db, "submissions"), {
        studentId: profile.uid,
        dayId,
        phaseId: "phase-1",
        type: isVideo ? "video" : (isFile ? "file" : "task"),
        content: contentUrl,
        submittedAt: serverTimestamp(),
        points: 0,
        status: "pending",
      });
    } catch {
      console.warn("Submission saved locally only - Firebase not configured");
    }
    setSubmissionStatus("submitted");
  };

  const handleTestSubmit = async () => {
    if (!profile || !dayData?.testConfig) return;
    try {
      await addDoc(collection(db, "submissions"), {
        studentId: profile.uid,
        dayId,
        phaseId: "phase-1",
        type: "test",
        answers,
        tabSwitches,
        submittedAt: serverTimestamp(),
        points: 0,
        status: "pending",
        totalQuestions: dayData.testConfig.questions.length,
      });
    } catch {
      console.warn("Test submission saved locally - Firebase not configured");
    }
    setTestStarted(false);
    alert("Test submitted successfully!");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!dayData) return <div>Day not found</div>;

  const getBadgeClass = () => {
    switch (dayData.type) {
      case "learning": return "badge-blue";
      case "task": return "badge-green";
      case "test": return "badge-orange";
      case "interview": return "badge-purple";
      default: return "badge-primary";
    }
  };

  const getTypeLabel = () => {
    switch (dayData.type) {
      case "learning": return "Learning";
      case "task": return "Task";
      case "test": return "Test";
      case "interview": return "Interview";
      default: return dayData.type;
    }
  };

  return (
    <div>
      <div className="portal-header">
        <div>
          <h1 className="portal-page-title">{dayData.title}</h1>
          <p className="portal-page-subtitle">
            <span className={`badge ${getBadgeClass()}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <DayTypeIcon type={dayData.type} size={12} />
              {getTypeLabel()}
            </span>
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{dayData.description}</p>
      </div>

      {/* ===== Learning Day ===== */}
      {dayData.type === "learning" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--space-6)" }}>
          <div>
            {/* Meet Link */}
            {dayData.meetLink && (
              <div className="card" style={{ marginBottom: "var(--space-6)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-1)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <IconVideo size={18} color="var(--accent-secondary)" />
                      Live Session
                    </h3>
                    <p className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <IconClock size={12} />
                      {dayData.meetTime}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <IconLiveDot size={16} color="var(--accent-secondary)" />
                    <a
                      href={dayData.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                      <IconExternalLink size={14} />
                      Join Meeting
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* YouTube Videos */}
            {dayData.youtubeVideos && dayData.youtubeVideos.length > 0 && (
              <div className="card" style={{ marginBottom: "var(--space-6)" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <IconPlay size={18} color="var(--accent-tertiary)" />
                  Video Resources
                </h3>
                {dayData.youtubeVideos.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      paddingBottom: "56.25%",
                      height: 0,
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    <iframe
                      src={url}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Materials */}
            {dayData.materials && dayData.materials.length > 0 && (
              <div className="card">
                <h3 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <IconFileText size={18} color="var(--accent-blue)" />
                  Study Materials
                </h3>
                {dayData.materials.map((mat, i) => (
                  <a
                    key={i}
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      transition: "background 0.2s",
                      textDecoration: "none",
                      color: "var(--text-secondary)",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface-glass-hover)")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <IconFileText size={16} />
                    <span>{mat.title}</span>
                    <span className="badge badge-primary" style={{ marginLeft: "auto", fontSize: "10px" }}>
                      {mat.type}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "600px",
              position: "sticky",
              top: "var(--space-4)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-base)",
                marginBottom: "var(--space-4)",
                paddingBottom: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <IconMessageCircle size={18} color="var(--accent-blue)" />
              Session Chat
            </h3>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "var(--space-4)" }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: "var(--space-3)",
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      background: msg.senderId === profile?.uid ? "rgba(232, 255, 71, 0.05)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: "var(--text-xs)" }}>{msg.senderName}</span>
                      <span className={`badge ${msg.role === "organiser" ? "badge-purple" : "badge-primary"}`} style={{ fontSize: "9px", padding: "1px 6px" }}>
                        {msg.role}
                      </span>
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{msg.text}</p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <input
                className="input"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                style={{ fontSize: "var(--text-sm)" }}
              />
              <button className="btn btn-primary" onClick={sendChatMessage} style={{ flexShrink: 0 }}>
                <IconSend size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Task Day ===== */}
      {dayData.type === "task" && dayData.taskConfig && (
        <div>
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconPencil size={18} color="var(--accent-secondary)" />
              Task Instructions
            </h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {dayData.taskConfig.instructions}
            </p>
            <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
              <span className="badge badge-primary">Max Points: {dayData.taskConfig.maxPoints}</span>
              <span className="badge badge-blue">Type: {dayData.taskConfig.submissionType}</span>
              {dayData.taskConfig.maxRecordings && (
                <span className="badge badge-orange">Max {dayData.taskConfig.maxRecordings} recordings</span>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-4)" }}>
              Submit Your Work
            </h3>

            {submissionStatus === "submitted" ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
                <div style={{ marginBottom: "var(--space-3)", display: "flex", justifyContent: "center" }}>
                  <IconCheckCircle size={48} color="var(--accent-secondary)" />
                </div>
                <h4 style={{ fontFamily: "var(--font-heading)", marginBottom: "var(--space-2)" }}>
                  Submitted Successfully!
                </h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                  Your submission is pending evaluation.
                </p>
              </div>
            ) : (
              <>
                {dayData.taskConfig.submissionType === "link" && (
                  <div className="input-group">
                    <label className="input-label">Submission Link</label>
                    <input
                      className="input"
                      placeholder="Paste your submission link here..."
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                    />
                  </div>
                )}

                {dayData.taskConfig.submissionType === "video" && (
                  <div style={{ marginBottom: "var(--space-6)" }}>
                    <VideoRecorder
                      onRecordingComplete={(blob: Blob) => setVideoBlob(blob)}
                      maxDurationSeconds={300}
                    />
                  </div>
                )}

                {dayData.taskConfig.submissionType === "file" && (
                  <div className="input-group">
                    <label className="input-label">Upload File (PDF, Word, etc.)</label>
                    <input
                      type="file"
                      className="input"
                      style={{ padding: "var(--space-2)" }}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFileBlob(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                )}

                <button
                  className="btn btn-primary btn-large w-full"
                  onClick={handleTaskSubmit}
                  disabled={
                    submissionStatus === "submitting" ||
                    (dayData.taskConfig.submissionType === "link" && !submissionLink.trim()) ||
                    (dayData.taskConfig.submissionType === "video" && !videoBlob) ||
                    (dayData.taskConfig.submissionType === "file" && !fileBlob)
                  }
                >
                  {submissionStatus === "submitting" ? (
                    <>
                      <span className="spinner" />
                      {dayData.taskConfig.submissionType === "video" || dayData.taskConfig.submissionType === "file" ? "Uploading..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <IconCheckCircle size={16} />
                      {dayData.taskConfig.submissionType === "video" ? "Upload & Submit Video" : dayData.taskConfig.submissionType === "file" ? "Upload & Submit File" : "Submit Task"}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Mock Interview Day ===== */}
      {dayData.type === ("interview" as string) && dayData.interviewConfig && (
        <div>
          {!interviewStarted ? (
            <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
              <div style={{ marginBottom: "var(--space-4)", display: "flex", justifyContent: "center" }}>
                <IconMic size={64} color="var(--accent-purple)" />
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-2xl)", marginBottom: "var(--space-4)" }}>
                {dayData.interviewConfig.type === "technical" ? "Technical" : "HR"} Mock Interview
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
                Duration: <strong>{dayData.interviewConfig.durationMinutes} minutes</strong>
              </p>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", maxWidth: 500, margin: "0 auto var(--space-6)" }}>
                You will be connected to a Jitsi video call with an evaluator. The session will simulate a real placement interview.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}>
                <button className="btn btn-primary btn-large" onClick={() => setInterviewStarted(true)} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <IconVideo size={18} />
                  Join Interview Room
                </button>
                <p className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <IconAlertTriangle size={12} />
                  Ensure camera & mic permissions are enabled
                </p>
              </div>
            </div>
          ) : (
            <div style={{ height: "70vh" }}>
              <JitsiMeeting
                roomName={`c2c-interview-${dayId}-${profile?.uid || "demo"}`}
                displayName={profile?.fullName || "Student"}
                onClose={() => setInterviewStarted(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== Test Day ===== */}
      {dayData.type === "test" && dayData.testConfig && (
        <div>
          {!testStarted ? (
            <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-2xl)", marginBottom: "var(--space-4)" }}>
                Ready to Begin?
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                <IconClock size={16} />
                Duration: <strong>{dayData.testConfig.duration} minutes</strong>
              </p>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
                Questions: <strong>{dayData.testConfig.questions.length}</strong>
              </p>
              {dayData.testConfig.monitoringEnabled && (
                <p style={{ color: "var(--accent-tertiary)", fontSize: "var(--text-xs)", marginBottom: "var(--space-6)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                  <IconAlertTriangle size={14} />
                  Tab switching, copy-paste, and right-click will be monitored
                </p>
              )}
              <button
                className="btn btn-primary btn-large"
                onClick={() => {
                  setTestStarted(true);
                  setTimeLeft(dayData.testConfig!.duration * 60);
                }}
              >
                <IconPlay size={16} />
                Start Test
              </button>
            </div>
          ) : (
            <div>
              {/* Timer & Warnings */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-6)",
                  padding: "var(--space-3) var(--space-5)",
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span className="mono-text" style={{ color: timeLeft < 60 ? "var(--accent-tertiary)" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <IconClock size={16} />
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                </span>
                <span className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                  Q {currentQuestion + 1}/{dayData.testConfig.questions.length}
                </span>
                {tabSwitches > 0 && (
                  <span className="badge badge-orange" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <IconAlertTriangle size={12} />
                    Tab switches: {tabSwitches}
                  </span>
                )}
              </div>

              {/* Question */}
              <div className="card" style={{ marginBottom: "var(--space-6)" }}>
                <div className="mono-text" style={{ fontSize: "var(--text-xs)", color: "var(--accent-primary)", marginBottom: "var(--space-3)" }}>
                  Question {currentQuestion + 1} — {dayData.testConfig.questions[currentQuestion].points} points
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", marginBottom: "var(--space-6)" }}>
                  {dayData.testConfig.questions[currentQuestion].question}
                </h3>

                {dayData.testConfig.questions[currentQuestion].type === "mcq" &&
                  dayData.testConfig.questions[currentQuestion].options?.map((opt, i) => (
                    <label
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${answers[currentQuestion] === opt ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                        marginBottom: "var(--space-2)",
                        cursor: "pointer",
                        background: answers[currentQuestion] === opt ? "rgba(232, 255, 71, 0.05)" : "transparent",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQuestion}`}
                        checked={answers[currentQuestion] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [currentQuestion]: opt }))}
                        style={{ accentColor: "var(--accent-primary)" }}
                      />
                      <span style={{ fontSize: "var(--text-sm)" }}>{opt}</span>
                    </label>
                  ))}

                {dayData.testConfig.questions[currentQuestion].type === "text" && (
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion]: e.target.value }))}
                    style={{ resize: "vertical" }}
                  />
                )}
              </div>

              {/* Navigation */}
              <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "space-between" }}>
                <button
                  className="btn btn-secondary"
                  disabled={currentQuestion === 0}
                  onClick={() => setCurrentQuestion((p) => p - 1)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                >
                  <IconChevronLeft size={14} />
                  Previous
                </button>
                {currentQuestion < dayData.testConfig.questions.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setCurrentQuestion((p) => p + 1)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                  >
                    Next
                    <IconChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleTestSubmit}
                    style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                  >
                    <IconCheckCircle size={14} />
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
