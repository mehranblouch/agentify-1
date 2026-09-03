import { google } from 'googleapis';

export async function appendAppointmentToSheet(
  refreshToken: string,
  sheetId: string,
  appointmentData: [string, string, string, string, string] // [Patient Name, Date, Time, Symptoms, Phone]
) {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [appointmentData],
      },
    });

    return true;
  } catch (error) {
    console.error('Google Sheets Append Error:', error);
    throw new Error('Failed to append appointment to Google Sheets.');
  }
}
