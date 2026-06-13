import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { appendSheetRecord } from "@/lib/google-sheets";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
    const body = await request.json();
    const action = body.action === "remove" ? "remove" : "assign";

    if (body.type === "organiser-day") {
      const { organiserId, phaseId, dayId } = body;
      if (!organiserId || !phaseId || !dayId) {
        return NextResponse.json({ error: "Organiser, phase, and day are required." }, { status: 400 });
      }

      const organiserRef = adminDb.collection("organisers").doc(organiserId);
      const dayRef = adminDb.collection("phases").doc(phaseId).collection("days").doc(dayId);
      const [organiserSnap, daySnap] = await Promise.all([organiserRef.get(), dayRef.get()]);
      if (!organiserSnap.exists || !daySnap.exists) {
        return NextResponse.json({ error: "The organiser or day no longer exists." }, { status: 404 });
      }
      if (daySnap.data()?.type !== "learning") {
        return NextResponse.json({ error: "Organisers can only be assigned to learning days." }, { status: 400 });
      }

      const batch = adminDb.batch();
      batch.update(organiserRef, {
        assignedDayIds:
          action === "assign"
            ? FieldValue.arrayUnion(`${phaseId}/${dayId}`)
            : FieldValue.arrayRemove(`${phaseId}/${dayId}`),
        updatedAt: new Date(),
      });
      batch.update(dayRef, {
        "learningConfig.organiserId": action === "assign" ? organiserId : "",
        "learningConfig.organiserName": action === "assign" ? organiserSnap.data()?.fullName || "" : "",
        updatedAt: new Date(),
      });
      await batch.commit();

      void appendSheetRecord("assignments", [
        "Organiser to learning day",
        organiserId,
        organiserSnap.data()?.fullName || "",
        `${phaseId}/${dayId}`,
        daySnap.data()?.title || "",
        daySnap.data()?.startsAt || "",
        daySnap.data()?.endsAt || "",
        new Date().toISOString(),
      ]).catch((error) => console.warn("Sheets assignment sync failed:", error));

      return NextResponse.json({ success: true });
    }

    if (body.type === "volunteer-student") {
      const { volunteerId, studentId } = body;
      if (!volunteerId || !studentId) {
        return NextResponse.json({ error: "Volunteer and student are required." }, { status: 400 });
      }

      const volunteerRef = adminDb.collection("evaluators").doc(volunteerId);
      const studentRef = adminDb.collection("students").doc(studentId);
      const [volunteerSnap, studentSnap] = await Promise.all([volunteerRef.get(), studentRef.get()]);
      if (!volunteerSnap.exists || !studentSnap.exists) {
        return NextResponse.json({ error: "The volunteer or student no longer exists." }, { status: 404 });
      }

      const batch = adminDb.batch();
      batch.update(volunteerRef, {
        assignedStudents:
          action === "assign" ? FieldValue.arrayUnion(studentId) : FieldValue.arrayRemove(studentId),
        updatedAt: new Date(),
      });
      batch.update(studentRef, {
        volunteerId: action === "assign" ? volunteerId : FieldValue.delete(),
        volunteerName: action === "assign" ? volunteerSnap.data()?.fullName || "" : FieldValue.delete(),
        updatedAt: new Date(),
      });

      if (action === "assign" && body.dayId && body.phaseId && body.startsAt && body.endsAt) {
        const dayRef = adminDb
          .collection("phases")
          .doc(body.phaseId)
          .collection("days")
          .doc(body.dayId);
        const daySnap = await dayRef.get();
        if (!daySnap.exists || daySnap.data()?.type !== "interview") {
          return NextResponse.json({ error: "Select a valid interview day." }, { status: 400 });
        }

        const roomName = `c2c-${body.dayId}-${studentId}-${Math.random().toString(36).slice(2, 10)}`;
        const slotRef = adminDb.collection("interviewSlots").doc(`${body.dayId}_${studentId}`);
        batch.set(slotRef, {
          phaseId: body.phaseId,
          dayId: body.dayId,
          dayTitle: daySnap.data()?.title || "",
          studentId,
          studentName: studentSnap.data()?.fullName || "",
          volunteerId,
          volunteerName: volunteerSnap.data()?.fullName || "",
          startsAt: new Date(body.startsAt).toISOString(),
          endsAt: new Date(body.endsAt).toISOString(),
          timezone: body.timezone || "Asia/Kolkata",
          roomName,
          status: "scheduled",
          updatedAt: new Date(),
          createdAt: new Date(),
        });
      }

      await batch.commit();
      void appendSheetRecord("assignments", [
        "Volunteer to student",
        volunteerId,
        volunteerSnap.data()?.fullName || "",
        studentId,
        studentSnap.data()?.fullName || "",
        body.startsAt || "",
        body.endsAt || "",
        new Date().toISOString(),
      ]).catch((error) => console.warn("Sheets assignment sync failed:", error));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid assignment type." }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Assignment error:", error);
    return NextResponse.json({ error: "Could not save the assignment." }, { status: 500 });
  }
}
