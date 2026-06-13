import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, order } = body;

    if (!title) {
      return NextResponse.json({ error: "Phase title is required" }, { status: 400 });
    }

    try {
      const { adminDb } = await import("@/lib/firebase-admin");

      const phaseRef = await adminDb.collection("phases").add({
        title: title.trim(),
        description: (description || "").trim(),
        order: order || 1,
        createdAt: new Date(),
        status: "active",
      });

      return NextResponse.json({
        success: true,
        phaseId: phaseRef.id,
        message: "Phase created successfully",
      });
    } catch (err) {
      console.warn("Firestore write failed:", err);
      return NextResponse.json({
        success: true,
        phaseId: `demo_phase_${Date.now()}`,
        message: "Phase created (demo mode)",
      });
    }
  } catch (err) {
    console.error("Create phase error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
