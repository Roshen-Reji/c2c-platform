import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const role = searchParams.get("role") || "student"; // student, organiser, evaluator

    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { adminAuth, adminDb } = await import("@/lib/firebase-admin");

    // Delete from Firestore
    let collectionName = "students";
    if (role === "organiser") collectionName = "organisers";
    if (role === "evaluator") collectionName = "evaluators";
    if (role === "admin") collectionName = "admins";

    await adminDb.collection(collectionName).doc(uid).delete();

    // Delete from Firebase Auth
    let authDeleted = true;
    let authErrorMessage = "";
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr: any) {
      // If user doesn't exist in auth but exists in DB, we still want the DB deletion to succeed
      authDeleted = false;
      authErrorMessage = authErr.message;
      console.warn(`Could not delete user ${uid} from Auth:`, authErr.message);
    }

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully",
      partial: !authDeleted,
      authError: authErrorMessage
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
