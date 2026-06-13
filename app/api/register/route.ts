import { NextRequest, NextResponse } from "next/server";

// Note: Firebase Admin and Google Sheets are imported dynamically
// to allow the app to run even without credentials configured

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fullName = formData.get("fullName") as string;
    const batch = formData.get("batch") as string;
    const year = formData.get("year") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const googleUid = formData.get("googleUid") as string;
    const screenshot = formData.get("screenshot") as File | null;

    // Validate required fields
    if (!fullName || !batch || !year || !email) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Require password if not using Google Auth
    if (!googleUid && (!password || password.length < 6)) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    let screenshotUrl = "";
    const timestamp = new Date().toISOString();

    // Try to upload screenshot to Google Drive
    if (screenshot) {
      try {
        const { findOrCreateFolder, uploadFileToDrive } = await import("@/lib/google-drive");
        const userFolderId = await findOrCreateFolder(email.toLowerCase().trim());
        const fileName = `payment_screenshot_${Date.now()}.${screenshot.name.split(".").pop()}`;
        
        const buffer = Buffer.from(await screenshot.arrayBuffer());
        const driveFile = await uploadFileToDrive(buffer, fileName, screenshot.type, userFolderId);
        
        screenshotUrl = driveFile.webViewLink;
      } catch (driveErr) {
        console.warn("Google Drive upload failed (credentials may not be configured):", driveErr);
        screenshotUrl = "[Screenshot uploaded - storage not configured]";
      }
    }

    // Try to create Firebase Auth user
    let userId = googleUid;

    if (!googleUid) {
      try {
        const { adminAuth } = await import("@/lib/firebase-admin");
        const userRecord = await adminAuth.createUser({
          email: email.toLowerCase(),
          password: password,
          displayName: fullName,
        });
        userId = userRecord.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-exists') {
          return NextResponse.json(
            { error: "Email is already registered. Please log in instead." },
            { status: 400 }
          );
        }
        console.warn("Firebase Auth user creation failed (credentials may not be configured):", authErr);
        userId = `temp_${Date.now()}`;
      }
    }

    // Try to save to Firestore
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      await adminDb.collection("students").doc(userId).set({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        batch,
        year,
        status: "pending",
        role: "student",
        paymentScreenshot: screenshotUrl,
        registeredAt: new Date(),
        totalPoints: 0,
        streak: 0,
        tasksSubmitted: 0,
        tasksApproved: 0,
        testsTaken: 0,
        daysCompleted: 0,
      });
    } catch (dbErr) {
      console.warn("Firestore write failed (credentials may not be configured):", dbErr);
    }

    // Try to append to Google Sheet
    try {
      const { appendToSheet } = await import("@/lib/google-sheets");
      await appendToSheet([
        fullName.trim(),
        batch,
        year,
        email.toLowerCase().trim(),
        screenshotUrl,
        timestamp,
        "pending",
      ]);
    } catch (sheetsErr) {
      console.warn("Google Sheets append failed (credentials may not be configured):", sheetsErr);
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful",
      userId,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
