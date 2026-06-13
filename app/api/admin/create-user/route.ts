import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
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

    const normalizedEmail = String(email).toLowerCase().trim();
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: normalizedEmail,
        password: tempPassword,
        displayName: String(name).trim(),
      });
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === "auth/email-already-exists") {
        return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
      }
      throw err;
    }

    const collectionName = role === "organiser" ? "organisers" : "evaluators";
    try {
      await adminDb.collection(collectionName).doc(userRecord.uid).set({
        fullName: String(name).trim(),
        email: normalizedEmail,
        role,
        assignedDayIds: [],
        assignedStudents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      });
    } catch (error) {
      await adminAuth.deleteUser(userRecord.uid).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      success: true,
      userId: userRecord.uid,
      tempPassword,
      message: `${role} account created successfully`,
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
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
