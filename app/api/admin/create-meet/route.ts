import { NextRequest, NextResponse } from "next/server";
import { createGoogleMeetEvent } from "@/lib/google-calendar";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
    const body = await request.json();
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!body.title || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) {
      return NextResponse.json({ error: "Title, start time, and end time are required." }, { status: 400 });
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: "The meeting must end after it starts." }, { status: 400 });
    }

    const result = await createGoogleMeetEvent({
      title: String(body.title).trim(),
      description: String(body.description || "").trim(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      timezone: String(body.timezone || "Asia/Kolkata"),
      attendeeEmails: Array.isArray(body.attendeeEmails) ? body.attendeeEmails : [],
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Create Meet error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the Google Meet event." },
      { status: 500 },
    );
  }
}
