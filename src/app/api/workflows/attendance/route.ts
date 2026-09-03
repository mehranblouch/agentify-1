import { NextResponse } from "next/server";
import { getWhatsAppSession } from "@/lib/whatsapp";
import { delay } from "@whiskeysockets/baileys";

/**
 * Education Workflow: Attendance Alert
 * This route processes attendance data (e.g. from Google Sheets via Make.com)
 * and sends WhatsApp notifications to parents of absent students.
 */
export async function POST(req: Request) {
  try {
    const { students, fromNumber, messageTemplate } = await req.json();

    if (!students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Students array is required" }, { status: 400 });
    }

    const sessionPhone = fromNumber || process.env.WHATSAPP_DEFAULT_NUMBER || "";
    if (!sessionPhone) {
      return NextResponse.json({ error: "No WhatsApp session configured." }, { status: 400 });
    }

    const sock = await getWhatsAppSession(sessionPhone);
    if (!sock) {
      return NextResponse.json({ error: "WhatsApp session not active." }, { status: 503 });
    }

    const absents = students.filter(s => s.status?.toLowerCase() === "absent");
    console.log(`[Education Workflow] Found ${absents.length} absent students.`);

    let sentCount = 0;

    for (const student of absents) {
      if (!student.phone) continue;

      const cleanPhone = student.phone.replace(/\D/g, "");
      const jid = `${cleanPhone}@s.whatsapp.net`;
      
      // Template variables
      let message = messageTemplate || "Dear Parent, your child {name} is absent today.";
      message = message.replace(/{name}/g, student.name || "Student");
      message = message.replace(/{father_name}/g, student.fatherName || "");
      message = message.replace(/{class}/g, student.class || "");

      try {
        await sock.sendPresenceUpdate("composing", jid);
        await delay(1000); // Small human-like delay
        await sock.sendMessage(jid, { text: message });
        sentCount++;
        console.log(`[Education Workflow] Notification sent to ${student.name} (${cleanPhone})`);
      } catch (err) {
        console.error(`[Education Workflow] Failed to send to ${cleanPhone}:`, err);
      }
      
      // Delay between bulk messages to prevent spam detection
      await delay(2000);
    }

    return NextResponse.json({ success: true, sent: sentCount, totalAbsents: absents.length });

  } catch (err: any) {
    console.error("Attendance Workflow Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
