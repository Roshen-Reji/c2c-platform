import { NextResponse } from "next/server";
import { appendSheetRecord } from "@/lib/google-sheets";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    await appendSheetRecord("preRegistrations", [
      email.toLowerCase().trim(),
      new Date().toISOString(),
      "Notification requested",
    ]);

    return NextResponse.json({ success: true, message: "Notification requested successfully" });
  } catch (error: any) {
    console.error("Pre-registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
