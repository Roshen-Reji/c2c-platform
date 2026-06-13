import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, ["student", "evaluator", "admin"]);
    let query: FirebaseFirestore.Query = adminDb.collection("interviewSlots");

    if (user.role === "student") {
      query = query.where("studentId", "==", user.uid);
    } else if (user.role === "evaluator") {
      query = query.where("volunteerId", "==", user.uid);
    }

    const snapshot = await query.get();
    const slots = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() } as { id: string; startsAt: string }))
      .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
    return NextResponse.json({ slots, serverNow: new Date().toISOString() });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Interview schedule error:", error);
    return NextResponse.json({ error: "Could not load interview schedules." }, { status: 500 });
  }
}
