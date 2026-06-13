import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getDayAccessState,
  normalizeQuestion,
  sanitizeQuestion,
  type ProgramDay,
} from "@/lib/program-types";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ phaseId: string; dayId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { phaseId, dayId } = await context.params;
    const snapshot = await adminDb
      .collection("phases")
      .doc(phaseId)
      .collection("days")
      .doc(dayId)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Day not found." }, { status: 404 });
    }

    const rawDay = snapshot.data() || {};
    const day = { id: snapshot.id, phaseId, ...rawDay } as ProgramDay;
    if (day.learningConfig || day.type === "learning") {
      day.learningConfig = {
        organiserId: day.learningConfig?.organiserId || "",
        organiserName: day.learningConfig?.organiserName || "",
        meetLink: day.learningConfig?.meetLink || String(rawDay.meetLink || ""),
        materials:
          day.learningConfig?.materials ||
          (Array.isArray(rawDay.materials) ? rawDay.materials : []),
        youtubeVideos:
          day.learningConfig?.youtubeVideos ||
          (Array.isArray(rawDay.youtubeVideos) ? rawDay.youtubeVideos : []),
      };
    }
    if (day.taskConfig) {
      day.taskConfig = {
        ...day.taskConfig,
        questions: Array.isArray(day.taskConfig.questions)
          ? day.taskConfig.questions.map(normalizeQuestion)
          : [],
      };
    }
    if (day.testConfig) {
      const legacy = day.testConfig as ProgramDay["testConfig"] & { duration?: number };
      day.testConfig = {
        ...day.testConfig,
        durationMinutes: day.testConfig.durationMinutes || legacy?.duration || 30,
        questions: Array.isArray(day.testConfig.questions)
          ? day.testConfig.questions.map(normalizeQuestion)
          : [],
        cameraRequired: day.testConfig.cameraRequired !== false,
        warningLimit: day.testConfig.warningLimit || 3,
        shuffleQuestions: Boolean(day.testConfig.shuffleQuestions),
        allowBackNavigation: day.testConfig.allowBackNavigation !== false,
      };
    }
    const accessState = getDayAccessState(day);
    const canManage =
      user.role === "admin" ||
      (user.role === "organiser" && day.learningConfig?.organiserId === user.uid);

    if (!canManage && !day.published) {
      return NextResponse.json({ error: "This day is not published." }, { status: 403 });
    }

    if (!canManage && day.testConfig) {
      day.testConfig = {
        ...day.testConfig,
        questions:
          accessState === "open"
            ? day.testConfig.questions.map(sanitizeQuestion)
            : [],
      };
    }

    let interviewSlot = null;
    if (day.type === "interview" && user.role !== "admin") {
      if (user.role === "student") {
        const slot = await adminDb.collection("interviewSlots").doc(`${dayId}_${user.uid}`).get();
        interviewSlot = slot.exists ? { id: slot.id, ...slot.data() } : null;
      } else if (user.role === "evaluator") {
        const slots = await adminDb
          .collection("interviewSlots")
          .where("dayId", "==", dayId)
          .where("volunteerId", "==", user.uid)
          .get();
        interviewSlot = slots.docs.map((item) => ({ id: item.id, ...item.data() }));
      }
    }

    return NextResponse.json({
      day,
      accessState,
      serverNow: new Date().toISOString(),
      interviewSlot,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Day read error:", error);
    return NextResponse.json({ error: "Could not load the day." }, { status: 500 });
  }
}
