import { NextResponse } from "next/server";

// Helper: Fetch Google Sheet as CSV (public sheets only)
async function fetchSheetData(sheetUrl: string): Promise<Record<string, string>[]> {
  // Convert sheet URL to CSV export URL
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("Invalid Google Sheet URL");

  const sheetId = match[1];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error("Could not read sheet. Make sure it is public.");

  const csv = await res.text();
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

// Helper: Send WhatsApp via the existing Baileys session
async function sendWhatsAppMessage(phone: string, message: string, baseUrl: string) {
  // Use internal WhatsApp sender API
  const res = await fetch(`${baseUrl}/api/integrations/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message }),
  });
  return res.ok;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sheetUrl, conditionColumn, conditionValue, phoneColumn, nameColumn, messageTemplate } = body;

    if (!sheetUrl || !conditionColumn || !conditionValue || !phoneColumn || !messageTemplate) {
      return NextResponse.json({ error: "Missing required workflow fields." }, { status: 400 });
    }

    // 1. Fetch sheet data
    let rows: Record<string, string>[];
    try {
      rows = await fetchSheetData(sheetUrl);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // 2. Filter rows matching condition
    const matchedRows = rows.filter(row => {
      const cellValue = row[conditionColumn] || "";
      return cellValue.toLowerCase().trim() === conditionValue.toLowerCase().trim();
    });

    if (matchedRows.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: `No rows found where ${conditionColumn} = "${conditionValue}". Check your sheet data.`
      });
    }

    // 3. Build messages and send
    const baseUrl = req.headers.get("origin") || "http://localhost:3000";
    let sentCount = 0;
    const errors: string[] = [];

    for (const row of matchedRows) {
      const phone = row[phoneColumn]?.replace(/\D/g, "");
      const name = nameColumn ? row[nameColumn] || "Student" : "Student";

      if (!phone || phone.length < 7) {
        errors.push(`Skipped: Invalid phone for ${name}`);
        continue;
      }

      // Replace template variables
      const message = messageTemplate
        .replace(/\{name\}/gi, name)
        .replace(/\{phone\}/gi, phone)
        .replace(/\{date\}/gi, row["Date"] || row["AppointmentDate"] || "N/A")
        .replace(/\{status\}/gi, row[conditionColumn] || conditionValue);

      // Add delay between messages (anti-spam)
      const globalRules = { minDelay: 4, maxDelay: 10 }; // Can be fetched from DB in production
      const delay = Math.floor(Math.random() * (globalRules.maxDelay - globalRules.minDelay + 1)) + globalRules.minDelay;
      await new Promise(r => setTimeout(r, delay * 1000));

      const ok = await sendWhatsAppMessage(phone, message, baseUrl);
      if (ok) {
        sentCount++;
      } else {
        errors.push(`Failed to send to ${name} (${phone})`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: matchedRows.length,
      errors,
    });

  } catch (err: any) {
    console.error("Workflow Execute Error:", err);
    return NextResponse.json({ error: "Internal error: " + err.message }, { status: 500 });
  }
}
