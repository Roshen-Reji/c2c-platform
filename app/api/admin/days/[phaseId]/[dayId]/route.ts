import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeQuestion, type DayType } from "@/lib/program-types";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

const TYPES: DayType[] = ["learning", "task", "test", "interview"];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ phaseId: string; dayId: string }> },
) {
  try {
    await requireUser(request, ["admin"]);
    const { phaseId, dayId } = await context.params;
    const body = await request.json();
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!body.title || !TYPES.includes(body.type)) {
      return NextResponse.json({ error: "A valid title and day type are required." }, { status: 400 });
    }
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      return NextResponse.json({ error: "The end time must be after the start time." }, { status: 400 });
    }

    const dayRef = adminDb.collection("phases").doc(phaseId).collection("days").doc(dayId);
    const existing = await dayRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Day not found." }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      title: String(body.title).trim(),
      type: body.type,
      description: String(body.description || "").trim(),
      order: Math.max(1, Number(body.order) || 1),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      timezone: String(body.timezone || "Asia/Kolkata"),
      published: body.published !== false,
      updatedAt: new Date(),
      learningConfig: FieldValue.delete(),
      taskConfig: FieldValue.delete(),
      testConfig: FieldValue.delete(),
      interviewConfig: FieldValue.delete(),
    };

    if (body.type === "learning") {
      update.learningConfig = {
        organiserId: String(body.learningConfig?.organiserId || ""),
        organiserName: String(body.learningConfig?.organiserName || ""),
        meetLink: String(body.learningConfig?.meetLink || ""),
        materials: Array.isArray(body.learningConfig?.materials) ? body.learningConfig.materials : [],
        youtubeVideos: Array.isArray(body.learningConfig?.youtubeVideos) ? body.learningConfig.youtubeVideos : [],
      };
    }
    if (body.type === "task") {
      update.taskConfig = {
        submissionType: ["link", "file", "video", "text"].includes(body.taskConfig?.submissionType)
          ? body.taskConfig.submissionType
          : "link",
        instructions: String(body.taskConfig?.instructions || ""),
        maxRecordings: Math.max(1, Number(body.taskConfig?.maxRecordings) || 1),
        maxPoints: Math.max(1, Number(body.taskConfig?.maxPoints) || 20),
        questions: Array.isArray(body.taskConfig?.questions)
          ? body.taskConfig.questions.map(normalizeQuestion)
          : [],
      };
    }
    if (body.type === "test") {
      const questions = Array.isArray(body.testConfig?.questions)
        ? body.testConfig.questions.map(normalizeQuestion)
        : [];
      if (questions.length === 0) {
        return NextResponse.json({ error: "A test needs at least one question." }, { status: 400 });
      }
      for (const [index, question] of questions.entries()) {
        if (!question.prompt) {
          return NextResponse.json({ error: `Question ${index + 1} needs a prompt.` }, { status: 400 });
        }
        if (
          question.type === "mcq" &&
          (!question.options ||
            question.options.length < 2 ||
            question.correctOption === undefined ||
            question.correctOption >= question.options.length)
        ) {
          return NextResponse.json(
            { error: `Question ${index + 1} needs options and a correct answer.` },
            { status: 400 },
          );
        }
      }
      update.testConfig = {
        questions,
        durationMinutes: Math.max(1, Number(body.testConfig?.durationMinutes) || 30),
        monitoringEnabled: body.testConfig?.monitoringEnabled !== false,
        cameraRequired: body.testConfig?.cameraRequired !== false,
        warningLimit: Math.max(1, Number(body.testConfig?.warningLimit) || 3),
        shuffleQuestions: Boolean(body.testConfig?.shuffleQuestions),
        allowBackNavigation: body.testConfig?.allowBackNavigation !== false,
      };
    }
    if (body.type === "interview") {
      update.interviewConfig = {
        interviewType: ["technical", "hr", "mixed"].includes(body.interviewConfig?.interviewType)
          ? body.interviewConfig.interviewType
          : "mixed",
        durationMinutes: Math.max(5, Number(body.interviewConfig?.durationMinutes) || 30),
        defaultVolunteerId: String(body.interviewConfig?.defaultVolunteerId || ""),
        defaultVolunteerName: String(body.interviewConfig?.defaultVolunteerName || ""),
      };
    }

    const oldOrganiser = existing.data()?.learningConfig?.organiserId || "";
    const newOrganiser = body.type === "learning" ? String(body.learningConfig?.organiserId || "") : "";
    const batch = adminDb.batch();
    batch.update(dayRef, update);
    if (oldOrganiser && oldOrganiser !== newOrganiser) {
      batch.update(adminDb.collection("organisers").doc(oldOrganiser), {
        assignedDayIds: FieldValue.arrayRemove(`${phaseId}/${dayId}`),
      });
    }
    if (newOrganiser && oldOrganiser !== newOrganiser) {
      batch.update(adminDb.collection("organisers").doc(newOrganiser), {
        assignedDayIds: FieldValue.arrayUnion(`${phaseId}/${dayId}`),
      });
    }
    await batch.commit();
    return NextResponse.json({ success: true, day: { id: dayId, phaseId, ...update } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Day update error:", error);
    return NextResponse.json({ error: "Could not update the day." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ phaseId: string; dayId: string }> },
) {
  try {
    await requireUser(request, ["admin"]);
    const { phaseId, dayId } = await context.params;
    const dayRef = adminDb.collection("phases").doc(phaseId).collection("days").doc(dayId);
    const snapshot = await dayRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Day not found." }, { status: 404 });
    }

    const batch = adminDb.batch();
    batch.delete(dayRef);
    const organiserId = snapshot.data()?.learningConfig?.organiserId;
    if (organiserId) {
      batch.update(adminDb.collection("organisers").doc(organiserId), {
        assignedDayIds: FieldValue.arrayRemove(`${phaseId}/${dayId}`),
      });
    }
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Day delete error:", error);
    return NextResponse.json({ error: "Could not delete the day." }, { status: 500 });
  }
}
