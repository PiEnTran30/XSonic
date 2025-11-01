import { google } from "googleapis";

/**
 * Get OAuth2 client with access token
 * Uses admin's OAuth token to upload to their Drive 2TB
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground";

  if (!clientId || !clientSecret) {
    console.warn("Google OAuth warning: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Refresh token flow will fail.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Set tokens - only refresh token is required, access token will be auto-refreshed
  const creds: any = {
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  };

  // If access token is provided, use it but mark as expired to force refresh
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
    creds.access_token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    creds.expiry_date = 1; // Force refresh on first use
  }

  oauth2Client.setCredentials(creds);

  // Enable automatic token refresh
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      console.log('🔄 New refresh token received');
    }
    if (tokens.access_token) {
      console.log('✅ Access token refreshed');
    }
  });

  return oauth2Client;
}

/**
 * Get Google Drive client using Service Account (fallback)
 */
function getServiceAccountDrive() {
  try {
    const credsJson = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credsJson) {
      console.warn("GOOGLE_DRIVE_CREDENTIALS not set");
      return null;
    }
    const creds = JSON.parse(credsJson);
    const scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file"
    ];
    const jwt = new google.auth.JWT(
      creds.client_email,
      undefined,
      creds.private_key,
      scopes
    );
    return google.drive({ version: "v3", auth: jwt });
  } catch (e: any) {
    console.warn("Google Drive Service Account not configured correctly:", e?.message);
    return null;
  }
}


/**
 * Upload file to Google Drive using OAuth2
 * Uploads to admin's Drive 2TB using their OAuth token
 *
 * SETUP REQUIRED:
 * 1. Get OAuth refresh token from Google OAuth Playground
 * 2. Set GOOGLE_OAUTH_REFRESH_TOKEN in .env.local
 * 3. Set GOOGLE_DRIVE_FOLDER_ID (parent folder in Drive 2TB)
 */
export async function uploadToDriveWithEmail(
  fileBuffer: Buffer,
  fileName: string,
  userEmail: string,
  mimeType: string,
  sharedFolderId?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  webContentLink: string;
  folderLink: string;
}> {
  try {
    const auth = getOAuth2Client();
    const drive = google.drive({ version: "v3", auth });

    // Use parent folder ID from env with highest priority, then shared param, then fallback
    const parentFolderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || sharedFolderId || "1LZReDgHoHj5Zt1-GrwiGwB5fCMMVSMoJ").trim();

    console.log("🔍 Environment check:", {
      hasSharedFolderId: !!sharedFolderId,
      hasEnvFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      usingFolderId: parentFolderId.substring(0, 10) + "...",
      hasAccessToken: !!process.env.GOOGLE_OAUTH_ACCESS_TOKEN,
      hasRefreshToken: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!(process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"),
      hasServiceAccountCreds: !!process.env.GOOGLE_DRIVE_CREDENTIALS,
    });

    if (!parentFolderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID not set in .env.local");
    }

    // Try OAuth path first; on failure, fallback to Service Account if configured
    let finalResult: {
      fileId: string;
      webViewLink: string;
      webContentLink: string;
      folderLink: string;
    } | null = null;

    const runUpload = async (driveClient: any, parentId: string) => {
      // Sanitize email for folder name
      const folderName = userEmail.replace(/@/g, "_").replace(/\./g, "_");

      // Create/find user's subfolder
      let userFolderId: string;
      const searchResponse = await driveClient.files.list({
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        userFolderId = searchResponse.data.files[0].id!;
        console.log(`Found existing folder for ${userEmail}: ${userFolderId}`);
      } else {
        const folderResponse = await driveClient.files.create({
          requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
          },
          fields: "id",
        });
        userFolderId = folderResponse.data.id!;
        console.log(`Created folder for ${userEmail}: ${userFolderId}`);

        try {
          await driveClient.permissions.create({
            fileId: userFolderId,
            requestBody: { type: "user", role: "reader", emailAddress: userEmail },
            sendNotificationEmail: false,
          });
          console.log(`Shared folder with ${userEmail} (Reader access)`);
        } catch (shareErr: any) {
          console.warn(`Failed to share folder with ${userEmail}:`, shareErr.message);
        }
      }

      const fileMetadata = { name: fileName, parents: [userFolderId] };
      const media = { mimeType: mimeType, body: require("stream").Readable.from(fileBuffer) };

      const response = await driveClient.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id, webViewLink, webContentLink",
      });

      const folderResponse = await driveClient.files.get({
        fileId: userFolderId,
        fields: "webViewLink",
      });

      console.log(`Uploaded to Drive for ${userEmail}: ${response.data.id}`);

      return {
        fileId: response.data.id!,
        webViewLink: response.data.webViewLink!,
        webContentLink: response.data.webContentLink || response.data.webViewLink!,
        folderLink: folderResponse.data.webViewLink!,
      };
    };

    try {
      finalResult = await runUpload(drive, parentFolderId);
    } catch (oauthErr: any) {
      console.warn("OAuth upload failed:", oauthErr?.message);
      throw new Error(`Google Drive upload failed: ${oauthErr.message}`);
    }

    return finalResult!;
  } catch (error: any) {
    console.error("Google Drive upload error:", error);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
}

/**
 * Generate Google OAuth authorization URL
 */
export function getAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground";

  const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
  ];

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Test Google Drive connection
 */
export async function testDriveConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const auth = getOAuth2Client();
    const drive = google.drive({ version: "v3", auth });

    // Try to list files to test connection
    const response = await drive.files.list({
      pageSize: 1,
      fields: "files(id, name)",
    });

    return {
      success: true,
      message: "Google Drive connection successful",
      details: {
        hasRefreshToken: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Google Drive connection failed",
      details: {
        hasRefreshToken: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
        error: error.message,
      },
    };
  }
}



