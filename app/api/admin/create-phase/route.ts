import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
    const body = await request.json();
    const { title, description, order } = body;

    if (!title) {
      return NextResponse.json({ error: "Phase title is required" }, { status: 400 });
    }

    const phaseRef = await adminDb.collection("phases").add({
      title: title.trim(),
      description: (description || "").trim(),
      order: Math.max(1, Number(order) || 1),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    });

    return NextResponse.json({
      success: true,
      phaseId: phaseRef.id,
      message: "Phase created successfully",
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("Create phase error:", err);
    return NextResponse.json({ error: "Could not create the phase." }, { status: 500 });
  }
}
