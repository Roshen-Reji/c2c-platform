import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

interface ReviewScope {
  all: boolean;
  studentIds: string[];
  dayIds: string[];
}

async function getScope(user: { uid: string; role: string }): Promise<ReviewScope> {
  if (user.role === "admin") return { all: true, studentIds: [], dayIds: [] };
  if (user.role === "evaluator") {
    const snapshot = await adminDb.collection("evaluators").doc(user.uid).get();
    return {
      all: false,
      studentIds: (snapshot.data()?.assignedStudents || []) as string[],
      dayIds: [],
    };
  }
  const snapshot = await adminDb.collection("organisers").doc(user.uid).get();
  return {
    all: false,
    studentIds: [],
    dayIds: ((snapshot.data()?.assignedDayIds || snapshot.data()?.assignedDays || []) as string[])
      .map((reference) => reference.split("/")[1])
      .filter(Boolean),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, ["admin", "organiser", "evaluator"]);
    const scope = await getScope(user);
    const snapshot = await adminDb.collection("submissions").get();
    const submissions = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((submission) => {
        if (scope.all) return true;
        const record = submission as { studentId?: string; dayId?: string };
        return scope.studentIds.includes(record.studentId || "") || scope.dayIds.includes(record.dayId || "");
      })
      .sort((a, b) => String((b as { submittedAt?: string }).submittedAt || "").localeCompare(String((a as { submittedAt?: string }).submittedAt || "")));

    return NextResponse.json({ submissions });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Reviews read error:", error);
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request, ["admin", "organiser", "evaluator"]);
    const body = await request.json();
    if (!body.submissionId) {
      return NextResponse.json({ error: "Submission ID is required." }, { status: 400 });
    }

    const submissionRef = adminDb.collection("submissions").doc(body.submissionId);
    const submissionSnapshot = await submissionRef.get();
    if (!submissionSnapshot.exists) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const submission = submissionSnapshot.data() || {};
    const scope = await getScope(user);
    const allowed =
      scope.all ||
      scope.studentIds.includes(String(submission.studentId || "")) ||
      scope.dayIds.includes(String(submission.dayId || ""));
    if (!allowed) {
      return NextResponse.json({ error: "This submission is outside your assignment." }, { status: 403 });
    }

    const maxPoints = Math.max(0, Number(submission.maxPoints) || 0);
    const points = Math.max(0, Math.min(maxPoints, Number(body.points) || 0));
    const previousPoints = Math.max(0, Number(submission.points) || 0);
    const wasApproved = submission.status === "approved" || submission.status === "graded";
    const studentRef = adminDb.collection("students").doc(submission.studentId);
    const batch = adminDb.batch();
    batch.update(submissionRef, {
      points,
      feedback: String(body.feedback || "").trim(),
      status: "approved",
      reviewedBy: user.uid,
      reviewerName: user.fullName,
      reviewedAt: new Date().toISOString(),
    });
    batch.update(studentRef, {
      totalPoints: FieldValue.increment(points - previousPoints),
      tasksApproved:
        submission.type === "task" && !wasApproved
          ? FieldValue.increment(1)
          : FieldValue.increment(0),
      updatedAt: new Date(),
    });
    await batch.commit();
    return NextResponse.json({ success: true, points });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Review update error:", error);
    return NextResponse.json({ error: "Could not save the review." }, { status: 500 });
  }
}
