export type DayType = "learning" | "task" | "test" | "interview";
export type QuestionType = "mcq" | "text";

export interface ProgramQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctOption?: number;
  points: number;
  required?: boolean;
}

export interface DayWindow {
  startsAt: string;
  endsAt: string;
  timezone: string;
}

export interface LearningConfig {
  organiserId?: string;
  organiserName?: string;
  meetLink?: string;
  materials?: { title: string; url: string; type: string }[];
  youtubeVideos?: string[];
}

export interface TaskConfig {
  submissionType: "link" | "file" | "video" | "text";
  instructions: string;
  maxRecordings?: number;
  maxPoints: number;
  questions: ProgramQuestion[];
}

export interface TestConfig {
  questions: ProgramQuestion[];
  durationMinutes: number;
  monitoringEnabled: boolean;
  cameraRequired: boolean;
  warningLimit: number;
  shuffleQuestions: boolean;
  allowBackNavigation: boolean;
}

export interface InterviewConfig {
  interviewType: "technical" | "hr" | "mixed";
  durationMinutes: number;
  defaultVolunteerId?: string;
  defaultVolunteerName?: string;
}

export interface ProgramDay extends DayWindow {
  id: string;
  phaseId: string;
  title: string;
  type: DayType;
  description: string;
  order: number;
  published: boolean;
  learningConfig?: LearningConfig;
  taskConfig?: TaskConfig;
  testConfig?: TestConfig;
  interviewConfig?: InterviewConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewSlot {
  id: string;
  phaseId: string;
  dayId: string;
  dayTitle: string;
  studentId: string;
  studentName: string;
  volunteerId: string;
  volunteerName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  roomName: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface MonitoringEvent {
  type: "tab_hidden" | "window_blur" | "fullscreen_exit" | "copy" | "paste" | "context_menu";
  occurredAt: string;
  questionId?: string;
}

export function getDayAccessState(day: Pick<ProgramDay, "startsAt" | "endsAt" | "published">, now = new Date()) {
  if (!day.published) return "draft" as const;
  const start = new Date(day.startsAt).getTime();
  const end = new Date(day.endsAt).getTime();
  const current = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid" as const;
  if (current < start) return "upcoming" as const;
  if (current > end) return "closed" as const;
  return "open" as const;
}

export function normalizeQuestion(raw: unknown, index: number): ProgramQuestion {
  const value = (raw || {}) as Record<string, unknown>;
  const type = value.type === "text" ? "text" : "mcq";
  const options = Array.isArray(value.options)
    ? value.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  return {
    id: String(value.id || `q-${index + 1}`),
    type,
    prompt: String(value.prompt || value.question || "").trim(),
    options: type === "mcq" ? options : undefined,
    correctOption:
      type === "mcq" && Number.isInteger(Number(value.correctOption))
        ? Number(value.correctOption)
        : undefined,
    points: Math.max(0, Number(value.points) || 1),
    required: value.required !== false,
  };
}

export function sanitizeQuestion(question: ProgramQuestion): ProgramQuestion {
  const safe = { ...question };
  delete safe.correctOption;
  return safe;
}
