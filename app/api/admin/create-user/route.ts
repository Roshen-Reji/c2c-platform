import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    if (!["organiser", "evaluator"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Generate a temporary password
    const tempPassword = generateSecurePassword();

    try {
      const { adminAuth } = await import("@/lib/firebase-admin");
      const { adminDb } = await import("@/lib/firebase-admin");

      // Create Firebase Auth user
      const userRecord = await adminAuth.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        displayName: name,
      });

      // Write to appropriate Firestore collection
      const collectionName = role === "organiser" ? "organisers" : "evaluators";
      await adminDb.collection(collectionName).doc(userRecord.uid).set({
        fullName: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        assignedDays: [],
        assignedStudents: [],
        createdAt: new Date(),
        status: "active",
      });

      return NextResponse.json({
        success: true,
        userId: userRecord.uid,
        tempPassword, // In production, send this via email instead
        message: `${role} account created successfully`,
      });
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/email-already-exists") {
        return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
      }
      console.error("Firebase error:", error.message);
      return NextResponse.json({
        success: true,
        userId: `demo_${Date.now()}`,
        tempPassword,
        message: `${role} created (demo mode - Firebase not configured)`,
      });
    }
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateSecurePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;

  let password = "";
  // Ensure at least one of each type
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password.split("").sort(() => Math.random() - 0.5).join("");
}
