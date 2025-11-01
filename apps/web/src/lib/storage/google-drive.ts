import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";
import fs from "fs";

// Initialize Google Drive API
let auth: any;
let drive: any;

try {
  // Try to load credentials from file first
  const credentialsPath = path.join(process.cwd(), "google-credentials.json");

  if (fs.existsSync(credentialsPath)) {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
  } else if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
    // Fallback to env variable
    auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS),
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
  } else {
    console.warn("Google Drive credentials not found. Upload to Drive will be disabled.");
  }

  if (auth) {
    drive = google.drive({ version: "v3", auth });
  }
} catch (error) {
  console.error("Failed to initialize Google Drive:", error);
}

/**
 * Upload file to Google Drive
 */
export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  webContentLink: string;
}> {
  if (!drive) {
    throw new Error("Google Drive is not configured. Please set up credentials.");
  }

  try {
    const fileMetadata: any = {
      name: fileName,
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: mimeType,
      body: Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    // Don't make public by default - will be shared with specific user later

    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink!,
      webContentLink: response.data.webContentLink!,
    };
  } catch (error: any) {
    console.error("Google Drive upload error:", error);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
}

/**
 * Download file from Google Drive
 */
export async function downloadFromDrive(fileId: string): Promise<Buffer> {
  try {
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "arraybuffer" }
    );

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    console.error("Google Drive download error:", error);
    throw new Error(`Failed to download from Google Drive: ${error.message}`);
  }
}

/**
 * Delete file from Google Drive
 */
export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error: any) {
    console.error("Google Drive delete error:", error);
    throw new Error(`Failed to delete from Google Drive: ${error.message}`);
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getDriveFileMetadata(fileId: string): Promise<{
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
}> {
  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: "name, mimeType, size, createdTime, modifiedTime",
    });

    return {
      name: response.data.name!,
      mimeType: response.data.mimeType!,
      size: parseInt(response.data.size || "0"),
      createdTime: response.data.createdTime!,
      modifiedTime: response.data.modifiedTime!,
    };
  } catch (error: any) {
    console.error("Google Drive metadata error:", error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  try {
    const fileMetadata: any = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    return response.data.id!;
  } catch (error: any) {
    console.error("Google Drive folder creation error:", error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
}

/**
 * List files in a folder
 */
export async function listDriveFiles(folderId?: string): Promise<
  Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdTime: string;
  }>
> {
  try {
    const query = folderId ? `'${folderId}' in parents` : undefined;

    const response = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType, size, createdTime)",
      orderBy: "createdTime desc",
    });

    return (
      response.data.files?.map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || "0"),
        createdTime: file.createdTime!,
      })) || []
    );
  } catch (error: any) {
    console.error("Google Drive list error:", error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Share file with specific user (by email)
 */
export async function shareWithUser(fileId: string, userEmail: string): Promise<void> {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "user",
        emailAddress: userEmail,
      },
      sendNotificationEmail: true,
    });
  } catch (error: any) {
    console.error("Google Drive share error:", error);
    throw new Error(`Failed to share with user: ${error.message}`);
  }
}

/**
 * Get direct download link for a file
 */
export async function getDriveDownloadLink(fileId: string): Promise<string> {
  try {
    // Make file publicly accessible if not already
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  } catch (error: any) {
    console.error("Google Drive link error:", error);
    throw new Error(`Failed to get download link: ${error.message}`);
  }
}

/**
 * Check if Google Drive is configured
 */
export function isDriveConfigured(): boolean {
  return !!process.env.GOOGLE_DRIVE_CREDENTIALS;
}

/**
 * Get storage usage
 */
export async function getDriveStorageUsage(): Promise<{
  limit: number;
  usage: number;
  usageInDrive: number;
}> {
  try {
    const response = await drive.about.get({
      fields: "storageQuota",
    });

    const quota = response.data.storageQuota!;

    return {
      limit: parseInt(quota.limit || "0"),
      usage: parseInt(quota.usage || "0"),
      usageInDrive: parseInt(quota.usageInDrive || "0"),
    };
  } catch (error: any) {
    console.error("Google Drive storage usage error:", error);
    throw new Error(`Failed to get storage usage: ${error.message}`);
  }
}

