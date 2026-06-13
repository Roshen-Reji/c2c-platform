import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import {
  normalizeQuestion,
  type DayType,
  type ProgramQuestion,
} from "@/lib/program-types";

const DAY_TYPES: DayType[] = ["learning", "task", "test", "interview"];

function validateQuestions(raw: unknown, requireCorrectAnswers: boolean) {
  if (!Array.isArray(raw)) return [];
  const questions = raw.map(normalizeQuestion);

  questions.forEach((question: ProgramQuestion, index: number) => {
    if (!question.prompt) throw new Error(`Question ${index + 1} needs a prompt.`);
    if (question.type !== "mcq") return;
    if (!question.options || question.options.length < 2) {
      throw new Error(`Question ${index + 1} needs at least two options.`);
    }
    if (
      requireCorrectAnswers &&
      (question.correctOption === undefined ||
        question.correctOption < 0 ||
        question.correctOption >= question.options.length)
    ) {
      throw new Error(`Question ${index + 1} needs a valid correct option.`);
    }
  });

  return questions;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
    const body = await request.json();
    const {
      phaseId,
      title,
      type,
      description,
      order,
      startsAt,
      endsAt,
      timezone,
      published,
      learningConfig,
      taskConfig,
      testConfig,
      interviewConfig,
    } = body;

    if (!phaseId || !String(title).trim() || !type || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "Phase, title, type, start time, and end time are required." },
        { status: 400 },
      );
    }

    if (!DAY_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid day type." }, { status: 400 });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "The end time must be after the start time." }, { status: 400 });
    }

    const phaseRef = adminDb.collection("phases").doc(phaseId);
    if (!(await phaseRef.get()).exists) {
      return NextResponse.json({ error: "The selected phase does not exist." }, { status: 404 });
    }

    const dayRef = phaseRef.collection("days").doc();
    const dayData: Record<string, unknown> = {
      phaseId,
      title: String(title).trim(),
      type,
      description: String(description || "").trim(),
      order: Math.max(1, Number(order) || 1),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      timezone: String(timezone || "Asia/Kolkata"),
      published: published !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (type === "learning") {
      dayData.learningConfig = {
        organiserId: String(learningConfig?.organiserId || ""),
        organiserName: String(learningConfig?.organiserName || ""),
        meetLink: String(learningConfig?.meetLink || ""),
        materials: Array.isArray(learningConfig?.materials) ? learningConfig.materials : [],
        youtubeVideos: Array.isArray(learningConfig?.youtubeVideos) ? learningConfig.youtubeVideos : [],
      };
    }

    if (type === "task") {
      const questions = validateQuestions(taskConfig?.questions, false);
      dayData.taskConfig = {
        submissionType: ["link", "file", "video", "text"].includes(taskConfig?.submissionType)
          ? taskConfig.submissionType
          : "link",
        instructions: String(taskConfig?.instructions || "").trim(),
        maxRecordings: Math.max(1, Number(taskConfig?.maxRecordings) || 1),
        maxPoints: Math.max(1, Number(taskConfig?.maxPoints) || 20),
        questions,
      };
    }

    if (type === "test") {
      const questions = validateQuestions(testConfig?.questions, true);
      if (questions.length === 0) {
        return NextResponse.json({ error: "A test needs at least one question." }, { status: 400 });
      }
      dayData.testConfig = {
        questions,
        durationMinutes: Math.max(1, Number(testConfig?.durationMinutes || testConfig?.duration) || 30),
        monitoringEnabled: testConfig?.monitoringEnabled !== false,
        cameraRequired: testConfig?.cameraRequired !== false,
        warningLimit: Math.max(1, Number(testConfig?.warningLimit) || 3),
        shuffleQuestions: Boolean(testConfig?.shuffleQuestions),
        allowBackNavigation: testConfig?.allowBackNavigation !== false,
      };
    }

    if (type === "interview") {
      dayData.interviewConfig = {
        interviewType: ["technical", "hr", "mixed"].includes(interviewConfig?.interviewType)
          ? interviewConfig.interviewType
          : "mixed",
        durationMinutes: Math.max(5, Number(interviewConfig?.durationMinutes) || 30),
        defaultVolunteerId: String(interviewConfig?.defaultVolunteerId || ""),
        defaultVolunteerName: String(interviewConfig?.defaultVolunteerName || ""),
      };
    }

    const batch = adminDb.batch();
    batch.set(dayRef, dayData);

    const organiserId = String(learningConfig?.organiserId || "");
    if (type === "learning" && organiserId) {
      batch.update(adminDb.collection("organisers").doc(organiserId), {
        assignedDayIds: FieldValue.arrayUnion(`${phaseId}/${dayRef.id}`),
        updatedAt: new Date(),
      });
    }
    await batch.commit();

    return NextResponse.json({
      success: true,
      dayId: dayRef.id,
      day: { id: dayRef.id, ...dayData },
      message: "Day created successfully",
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof Error && err.message.startsWith("Question")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Create day error:", err);
    return NextResponse.json({ error: "Could not create the day." }, { status: 500 });
  }
}
