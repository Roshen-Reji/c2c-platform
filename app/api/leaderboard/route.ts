import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, ["student", "admin", "organiser", "evaluator"]);
    const snapshot = await adminDb
      .collection("students")
      .orderBy("totalPoints", "desc")
      .limit(200)
      .get();
    const entries = snapshot.docs
      .filter((item) => (item.data().role || "student") === "student" && item.data().status === "approved")
      .map((item) => ({
        id: item.id,
        fullName: item.data().fullName || "",
        batch: item.data().batch || "-",
        totalPoints: item.data().totalPoints || 0,
        tasksSubmitted: item.data().tasksSubmitted || 0,
        tasksApproved: item.data().tasksApproved || 0,
        earliestSubmission: item.data().earliestSubmission?.toMillis?.() || null,
      }));
    return NextResponse.json({ entries });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Could not load the leaderboard." }, { status: 500 });
  }
}
