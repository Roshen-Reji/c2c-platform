import "server-only";

import { google } from "googleapis";

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  return new google.auth.GoogleAuth({
    credentials: JSON.parse(key),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const SHEETS = {
  registrations: {
    title: "Registrations",
    headers: ["Student ID", "Full Name", "Email", "Branch", "Year", "Payment Proof", "Registered At", "Status"],
  },
  preRegistrations: {
    title: "Pre-Registrations",
    headers: ["Email", "Requested At", "Status"],
  },
  submissions: {
    title: "Submissions",
    headers: ["Submission ID", "Student ID", "Student Name", "Phase ID", "Day ID", "Day Title", "Type", "Submitted At", "Status", "Points", "Content URL"],
  },
  examAttempts: {
    title: "Exam Attempts",
    headers: ["Attempt ID", "Student ID", "Student Name", "Phase ID", "Day ID", "Started At", "Submitted At", "Score", "Max Score", "Warning Count", "Status"],
  },
  assignments: {
    title: "Assignments",
    headers: ["Assignment Type", "Owner ID", "Owner Name", "Target ID", "Target Name", "Starts At", "Ends At", "Updated At"],
  },
} as const;

export type SheetKey = keyof typeof SHEETS;

async function getClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID environment variable is not set");
  }
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  return { sheetId, sheets };
}

async function ensureSheet(key: SheetKey) {
  const { sheetId, sheets } = await getClient();
  const definition = SHEETS[key];
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties",
  });
  let sheet = metadata.data.sheets?.find((item) => item.properties?.title === definition.title);

  if (!sheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: definition.title, gridProperties: { frozenRowCount: 1 } } } }],
      },
    });
    const refreshed = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "sheets.properties",
    });
    sheet = refreshed.data.sheets?.find((item) => item.properties?.title === definition.title);
  }

  const sheetNumericId = sheet?.properties?.sheetId;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${definition.title}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [[...definition.headers]] },
  });

  if (sheetNumericId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: sheetNumericId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.15, blue: 0.25 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: sheetNumericId, dimension: "COLUMNS" },
            },
          },
        ],
      },
    });
  }

  return { sheetId, sheets, definition };
}

export async function appendSheetRecord(key: SheetKey, values: (string | number | boolean)[]) {
  const { sheetId, sheets, definition } = await ensureSheet(key);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${definition.title}'!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

export async function readFromSheet(range: string) {
  const { sheetId, sheets } = await getClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return response.data.values || [];
}
