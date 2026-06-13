import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function PATCH(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
    const body = await request.json();
    if (!body.studentId || !["approved", "rejected", "pending"].includes(body.status)) {
      return NextResponse.json({ error: "Student and valid status are required." }, { status: 400 });
    }
    await adminDb.collection("students").doc(body.studentId).update({
      status: body.status,
      updatedAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Student update error:", error);
    return NextResponse.json({ error: "Could not update the student." }, { status: 500 });
  }
}
