import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export class AuthError extends Error {
  public status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export interface ServerUser {
  uid: string;
  email: string;
  role: string;
  fullName: string;
  [key: string]: any;
}

export async function requireUser(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<ServerUser> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header.", 401);
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    throw new AuthError("Missing authorization token.", 401);
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    throw new AuthError("Invalid or expired authorization token.", 401);
  }

  const uid = decodedToken.uid;
  let userDoc = null;
  let userRole = "";
  
  const collections = [
    { name: "admins", role: "admin" },
    { name: "organisers", role: "organiser" },
    { name: "evaluators", role: "evaluator" },
    { name: "students", role: "student" },
  ];

  for (const col of collections) {
    const docSnap = await adminDb.collection(col.name).doc(uid).get();
    if (docSnap.exists) {
      userDoc = docSnap.data();
      userRole = userDoc?.role || col.role;
      break;
    }
  }

  if (!userDoc) {
    throw new AuthError("User profile not found.", 403);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    throw new AuthError("You do not have permission to perform this action.", 403);
  }

  return {
    uid,
    email: decodedToken.email || userDoc.email || "",
    role: userRole,
    fullName: userDoc.fullName || userDoc.name || "",
    ...userDoc
  };
}

export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
