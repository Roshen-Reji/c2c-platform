import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  return new google.auth.GoogleAuth({
    credentials: JSON.parse(key),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

// Lazy initialization of the drive client
let driveClient: any = null;

function getDrive() {
  if (!driveClient) {
    driveClient = google.drive({ version: "v3", auth: getAuth() });
  }
  return driveClient;
}

// Convert Buffer to Readable stream for the Drive API
function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Finds a folder by name, optionally within a parent folder. 
 * If it doesn't exist, creates it.
 */
export async function findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
  const drive = getDrive();
  
  // Use master folder as default root if configured and no parent provided
  let effectiveParentId = parentId;
  if (!effectiveParentId && process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID) {
    effectiveParentId = process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID;
  }
  
  // Try to find the folder first
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (effectiveParentId) {
    query += ` and '${effectiveParentId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // If not found, create it
  const fileMetadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  
  if (effectiveParentId) {
    fileMetadata.parents = [effectiveParentId];
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Uploads a file buffer to Google Drive.
 * Makes the file publicly accessible to anyone with the link.
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ webViewLink: string; webContentLink: string }> {
  const drive = getDrive();
  
  const fileMetadata: any = {
    name: fileName,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: mimeType,
    body: bufferToStream(buffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink, webContentLink",
  });

  const fileId = file.data.id!;

  // Make the file publicly accessible to anyone with the link
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    webViewLink: file.data.webViewLink!,
    webContentLink: file.data.webContentLink!,
  };
}
