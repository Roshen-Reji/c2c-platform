import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Try to get the user by email
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "Account not found. Please register first." },
          { status: 404 }
        );
      }
      throw err;
    }

    // Check if the user already has a password set
    // In Firebase Admin SDK, a user with an email/password account will have
    // 'password' as one of the providerIds in their providerData.
    const hasPassword = user.providerData.some(
      (provider) => provider.providerId === "password"
    );

    if (hasPassword) {
      return NextResponse.json(
        { error: "A password is already set for this account." },
        { status: 400 }
      );
    }

    // Set the new password
    await adminAuth.updateUser(user.uid, {
      password: password,
    });

    return NextResponse.json({
      success: true,
      message: "Password set successfully.",
    });
  } catch (err) {
    console.error("Setup password error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
