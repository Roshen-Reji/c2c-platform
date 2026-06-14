import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { appendSheetRecord } from "@/lib/google-sheets";
import { getDayAccessState, type ProgramDay } from "@/lib/program-types";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, ["student"]);
    const body = await request.json();
    if (!body.phaseId || !body.dayId) {
      return NextResponse.json({ error: "Phase and day are required." }, { status: 400 });
    }

    const daySnapshot = await adminDb
      .collection("phases")
      .doc(body.phaseId)
      .collection("days")
      .doc(body.dayId)
      .get();
    if (!daySnapshot.exists) {
      return NextResponse.json({ error: "Day not found." }, { status: 404 });
    }
    const day = {
      id: body.dayId,
      phaseId: body.phaseId,
      ...daySnapshot.data(),
    } as ProgramDay;
    if (day.type !== "task" || !day.taskConfig) {
      return NextResponse.json({ error: "This day does not accept task submissions." }, { status: 400 });
    }
    if (getDayAccessState(day) !== "open") {
      return NextResponse.json({ error: "This task is not currently open." }, { status: 403 });
    }

    const content = String(body.content || "").trim();
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};
    if (!content && day.taskConfig.questions.length === 0) {
      return NextResponse.json({ error: "Add your task submission before sending." }, { status: 400 });
    }

    const submissionRef = adminDb.collection("submissions").doc();
    const submittedAt = new Date().toISOString();
    const batch = adminDb.batch();
    batch.set(submissionRef, {
      studentId: user.uid,
      studentName: user.fullName,
      phaseId: body.phaseId,
      dayId: body.dayId,
      dayTitle: day.title,
      type: "task",
      submissionType: day.taskConfig.submissionType,
      content,
      answers,
      submittedAt,
      points: 0,
      maxPoints: day.taskConfig.maxPoints,
      status: "pending_review",
    });
    batch.update(adminDb.collection("students").doc(user.uid), {
      tasksSubmitted: FieldValue.increment(1),
      updatedAt: new Date(),
    });
    await batch.commit();

    try {
      await appendSheetRecord("submissions", [
        submissionRef.id,
        user.uid,
        user.fullName,
        body.phaseId,
        body.dayId,
        day.title,
        day.taskConfig.submissionType,
        submittedAt,
        "Pending review",
        0,
        content,
      ]);
    } catch (error) {
      console.warn("Submission Sheets sync failed:", error);
    }

    return NextResponse.json({ success: true, submissionId: submissionRef.id });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Could not save the submission." }, { status: 500 });
  }
}
