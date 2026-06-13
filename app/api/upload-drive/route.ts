import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userEmail = formData.get("userEmail") as string | null;
    const dayId = formData.get("dayId") as string | null;

    if (!file || !userEmail || !dayId) {
      return NextResponse.json(
        { error: "Missing required fields (file, userEmail, dayId)" },
        { status: 400 }
      );
    }

    const { findOrCreateFolder, uploadFileToDrive } = await import("@/lib/google-drive");

    // Create the hierarchy: User Folder -> Day Folder -> File
    const userFolderId = await findOrCreateFolder(userEmail.toLowerCase().trim());
    const dayFolderId = await findOrCreateFolder(`Day_${dayId}`, userFolderId);

    const buffer = Buffer.from(await file.arrayBuffer());
    // Create a safe unique filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;

    const driveFile = await uploadFileToDrive(buffer, fileName, file.type, dayFolderId);

    return NextResponse.json({
      success: true,
      url: driveFile.webViewLink,
      contentUrl: driveFile.webContentLink,
    });
  } catch (err) {
    console.error("Error uploading to Google Drive:", err);
    return NextResponse.json(
      { error: "Failed to upload file to Google Drive. Credentials may be missing." },
      { status: 500 }
    );
  }
}
