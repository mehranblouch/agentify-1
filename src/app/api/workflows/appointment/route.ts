import { NextResponse } from "next/server";

// POST: Collect appointment details and log to Google Sheet
export async function POST(req: Request) {
  try {
    const { name, phone, date, notes, sheetId } = await req.json();

    if (!name || !phone || !date) {
      return NextResponse.json({ error: "Missing required fields: name, phone, date" }, { status: 400 });
    }

    if (!sheetId) {
      // If no sheet configured, just return success (for demo mode)
      return NextResponse.json({
        success: true,
        message: `Appointment saved for ${name} on ${date}.`,
        demo: true
      });
    }

    // In production: use Google Sheets API with OAuth to write a new row
    // For now, we return a success response and log to console
    console.log(`[Appointment] Saving: ${name} | ${phone} | ${date} | ${notes || "No notes"} → Sheet: ${sheetId}`);

    // Build the confirmation message
    const confirmationMessage = `Thank you ${name}! Your appointment is confirmed for ${date}. We will call you at ${phone}. Please arrive 10 minutes early.`;

    return NextResponse.json({
      success: true,
      confirmationMessage,
      data: { name, phone, date, notes },
    });

  } catch (err: any) {
    console.error("Appointment API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
