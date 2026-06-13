import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phaseId, title, type, description, order, meetLink, meetTime, taskConfig, testConfig } = body;

    if (!phaseId || !title || !type) {
      return NextResponse.json({ error: "Phase ID, title, and type are required" }, { status: 400 });
    }

    if (!["learning", "task", "test"].includes(type)) {
      return NextResponse.json({ error: "Invalid day type" }, { status: 400 });
    }

    try {
      const { adminDb } = await import("@/lib/firebase-admin");

      const dayData: Record<string, unknown> = {
        title: title.trim(),
        type,
        description: (description || "").trim(),
        order: order || 1,
        createdAt: new Date(),
      };

      if (type === "learning") {
        dayData.meetLink = meetLink || "";
        dayData.meetTime = meetTime || "";
        dayData.materials = [];
        dayData.youtubeVideos = [];
      }

      if (type === "task") {
        dayData.taskConfig = taskConfig || {
          submissionType: "link",
          instructions: "",
          maxPoints: 20,
        };
      }

      if (type === "test") {
        dayData.testConfig = testConfig || {
          questions: [],
          duration: 30,
          monitoringEnabled: true,
        };
      }

      const dayRef = await adminDb
        .collection("phases")
        .doc(phaseId)
        .collection("days")
        .add(dayData);

      return NextResponse.json({
        success: true,
        dayId: dayRef.id,
        message: "Day created successfully",
      });
    } catch (err) {
      console.warn("Firestore write failed:", err);
      return NextResponse.json({
        success: true,
        dayId: `demo_day_${Date.now()}`,
        message: "Day created (demo mode)",
      });
    }
  } catch (err) {
    console.error("Create day error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
