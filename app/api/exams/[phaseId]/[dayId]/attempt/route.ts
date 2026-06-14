import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { appendSheetRecord } from "@/lib/google-sheets";
import { getDayAccessState, sanitizeQuestion, type MonitoringEvent, type ProgramDay } from "@/lib/program-types";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

function shuffled<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ phaseId: string; dayId: string }> },
) {
  try {
    const user = await requireUser(request, ["student"]);
    const { phaseId, dayId } = await context.params;
    const body = await request.json();
    const dayRef = adminDb.collection("phases").doc(phaseId).collection("days").doc(dayId);
    const daySnapshot = await dayRef.get();
    if (!daySnapshot.exists) {
      return NextResponse.json({ error: "Test day not found." }, { status: 404 });
    }

    const day = { id: dayId, phaseId, ...daySnapshot.data() } as ProgramDay;
    if (day.type !== "test" || !day.testConfig) {
      return NextResponse.json({ error: "This day is not a test." }, { status: 400 });
    }
    if (getDayAccessState(day) !== "open") {
      return NextResponse.json({ error: "The test is not currently open." }, { status: 403 });
    }

    const attemptId = `${dayId}_${user.uid}`;
    const attemptRef = adminDb.collection("testAttempts").doc(attemptId);

    if (body.action === "start") {
      const result = await adminDb.runTransaction(async (transaction) => {
        const existing = await transaction.get(attemptRef);
        if (existing.exists) {
          const data = existing.data() || {};
          if (data.status === "submitted") {
            throw new Error("This test has already been submitted.");
          }
          return data;
        }

        const startedAt = new Date();
        const durationDeadline = new Date(
          startedAt.getTime() + day.testConfig!.durationMinutes * 60_000,
        );
        const dayDeadline = new Date(day.endsAt);
        const deadlineAt =
          dayDeadline < durationDeadline ? dayDeadline : durationDeadline;
        const questionOrder = day.testConfig!.shuffleQuestions
          ? shuffled(day.testConfig!.questions.map((question) => question.id))
          : day.testConfig!.questions.map((question) => question.id);

        const data = {
          attemptId,
          studentId: user.uid,
          studentName: user.fullName,
          phaseId,
          dayId,
          dayTitle: day.title,
          startedAt: startedAt.toISOString(),
          deadlineAt: deadlineAt.toISOString(),
          questionOrder,
          answers: {},
          warningEvents: [],
          status: "in_progress",
          updatedAt: new Date(),
        };
        transaction.create(attemptRef, data);
        return data;
      });

      const questionsById = new Map(day.testConfig.questions.map((question) => [question.id, question]));
      const orderedQuestions = (result.questionOrder as string[])
        .map((id) => questionsById.get(id))
        .filter(Boolean)
        .map((question) => sanitizeQuestion(question!));

      return NextResponse.json({
        success: true,
        attempt: {
          attemptId,
          startedAt: result.startedAt,
          deadlineAt: result.deadlineAt,
          answers: result.answers || {},
          warningEvents: result.warningEvents || [],
          questions: orderedQuestions,
        },
        serverNow: new Date().toISOString(),
      });
    }

    if (body.action === "autosave") {
      const attempt = await attemptRef.get();
      if (!attempt.exists || attempt.data()?.status !== "in_progress") {
        return NextResponse.json({ error: "No active attempt was found." }, { status: 409 });
      }
      await attemptRef.update({
        answers: body.answers && typeof body.answers === "object" ? body.answers : {},
        warningEvents: Array.isArray(body.warningEvents) ? body.warningEvents.slice(-200) : [],
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true });
    }

    if (body.action !== "submit") {
      return NextResponse.json({ error: "Invalid exam action." }, { status: 400 });
    }

    const attempt = await attemptRef.get();
    if (!attempt.exists) {
      return NextResponse.json({ error: "Start the test before submitting it." }, { status: 409 });
    }
    if (attempt.data()?.status === "submitted") {
      return NextResponse.json({ error: "This test has already been submitted." }, { status: 409 });
    }

    const answers =
      body.answers && typeof body.answers === "object"
        ? (body.answers as Record<string, string>)
        : {};
    const warningEvents = (Array.isArray(body.warningEvents)
      ? body.warningEvents.slice(-200)
      : []) as MonitoringEvent[];
    let score = 0;
    let maxScore = 0;
    let hasTextAnswers = false;

    day.testConfig.questions.forEach((question) => {
      maxScore += question.points;
      if (question.type === "text") {
        hasTextAnswers = true;
        return;
      }
      if (
        question.correctOption !== undefined &&
        answers[question.id] === String(question.correctOption)
      ) {
        score += question.points;
      }
    });

    const submittedAt = new Date().toISOString();
    const submissionRef = adminDb.collection("submissions").doc();
    const batch = adminDb.batch();
    batch.update(attemptRef, {
      answers,
      warningEvents,
      warningCount: warningEvents.length,
      cameraRecordingUrl: String(body.cameraRecordingUrl || ""),
      score,
      maxScore,
      status: "submitted",
      submittedAt,
      updatedAt: new Date(),
    });
    batch.set(submissionRef, {
      studentId: user.uid,
      studentName: user.fullName,
      phaseId,
      dayId,
      dayTitle: day.title,
      type: "test",
      answers,
      warningEvents,
      warningCount: warningEvents.length,
      cameraRecordingUrl: String(body.cameraRecordingUrl || ""),
      submittedAt,
      points: score,
      maxPoints: maxScore,
      status: hasTextAnswers ? "pending_review" : "graded",
      attemptId,
    });
    batch.update(adminDb.collection("students").doc(user.uid), {
      testsTaken: FieldValue.increment(1),
      totalPoints: FieldValue.increment(score),
      updatedAt: new Date(),
    });
    await batch.commit();

    try {
      await appendSheetRecord("examAttempts", [
        attemptId,
        user.uid,
        user.fullName,
        phaseId,
        dayId,
        attempt.data()?.startedAt || "",
        submittedAt,
        score,
        maxScore,
        warningEvents.length,
        hasTextAnswers ? "Pending text review" : "Graded",
      ]);
    } catch (error) {
      console.warn("Exam Sheets sync failed:", error);
    }

    return NextResponse.json({
      success: true,
      score,
      maxScore,
      status: hasTextAnswers ? "pending_review" : "graded",
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof Error && error.message === "This test has already been submitted.") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Exam attempt error:", error);
    return NextResponse.json({ error: "Could not process the test attempt." }, { status: 500 });
  }
}
