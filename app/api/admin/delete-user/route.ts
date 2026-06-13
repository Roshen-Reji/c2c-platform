import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export async function DELETE(request: NextRequest) {
  try {
    await requireUser(request, ["admin"]);
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const role = searchParams.get("role") || "student"; // student, organiser, evaluator

    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

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
    } catch (authErr: unknown) {
      // If user doesn't exist in auth but exists in DB, we still want the DB deletion to succeed
      authDeleted = false;
      authErrorMessage = authErr instanceof Error ? authErr.message : "Unknown Firebase Auth error";
      console.warn(`Could not delete user ${uid} from Auth:`, authErrorMessage);
    }

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully",
      partial: !authDeleted,
      authError: authErrorMessage
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Could not delete the user." }, { status: 500 });
  }
}
