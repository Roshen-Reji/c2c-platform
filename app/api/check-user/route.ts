import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await adminAuth.getUserByEmail(email.toLowerCase().trim());
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return NextResponse.json({ exists: false, hasPassword: false });
      }
      throw err;
    }

    const hasPassword = user.providerData.some(
      (provider) => provider.providerId === "password"
    );

    return NextResponse.json({
      exists: true,
      hasPassword: hasPassword,
    });
  } catch (err) {
    console.error("Check user error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
