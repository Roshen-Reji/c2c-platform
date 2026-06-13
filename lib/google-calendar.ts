import "server-only";

import { google } from "googleapis";

function getCalendarClient() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured.");

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(key),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function createGoogleMeetEvent(input: {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  attendeeEmails?: string[];
}) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID is not configured.");
  }

  const calendar = getCalendarClient();
  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: input.attendeeEmails?.length ? "all" : "none",
    requestBody: {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startsAt, timeZone: input.timezone },
      end: { dateTime: input.endsAt, timeZone: input.timezone },
      attendees: input.attendeeEmails?.filter(Boolean).map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `c2c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink = response.data.hangoutLink;
  if (!meetLink) throw new Error("Google Calendar did not return a Meet link.");
  return { meetLink, eventId: response.data.id || "" };
}
