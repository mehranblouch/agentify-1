import { NextResponse } from "next/server";
import { getStudents, getAttendanceLogs, markNotified, getEducationSettings, logMessage } from "@/lib/services/sqlite-store";
import { getWhatsAppSession } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, type, message, date } = body; // type: 'absent' or 'broadcast'
    
    if (!userId || !type) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });

    const settings = getEducationSettings(userId);
    const cleanNumber = settings.whatsapp_number ? settings.whatsapp_number.replace(/\D/g, "") : "";
    
    if (!cleanNumber) {
      return NextResponse.json({ success: false, error: "No WhatsApp number configured in Education Settings" }, { status: 400 });
    }

    const sock = await getWhatsAppSession(cleanNumber);
    if (!sock) {
      return NextResponse.json({ success: false, error: "WhatsApp not connected" }, { status: 400 });
    }

    const students = getStudents(userId);
    let sentCount = 0;

    if (type === "absent") {
      if (!date) return NextResponse.json({ success: false, error: "Missing date" }, { status: 400 });
      
      const logs = getAttendanceLogs(userId, date);
      const absentLogs = logs.filter(l => l.status === "absent" && !l.notified);

      // Group by phone number (for siblings)
      const alertsByPhone: { [phone: string]: { logIds: string[], names: string[] } } = {};
      
      for (const log of absentLogs) {
        const student = students.find(s => s.id === log.student_id);
        if (student) {
          const phone = student.phone.replace(/\D/g, "");
          if (!alertsByPhone[phone]) alertsByPhone[phone] = { logIds: [], names: [] };
          alertsByPhone[phone].logIds.push(log.id);
          alertsByPhone[phone].names.push(student.name);
        }
      }

      for (const [phone, data] of Object.entries(alertsByPhone)) {
        const names = data.names.join(" and ");
        const text = `*Attendance Alert*\n\nDear Parent,\nThis is to inform you that ${names} has been marked absent today (${date}) at ${settings.institute_name}.\n\nPlease ensure their regular attendance.`;
        
        try {
          await sock.sendMessage(`${phone}@s.whatsapp.net`, { text });
          data.logIds.forEach(id => markNotified(id));
          logMessage(userId, "outgoing", phone, text);
          sentCount++;
        } catch (e) {
          console.error("Failed to send to", phone, e);
        }
        // Small delay to avoid ban
        await new Promise(r => setTimeout(r, 1000));
      }

    } else if (type === "broadcast") {
      if (!message) return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
      
      const uniquePhones = Array.from(new Set(students.map(s => s.phone.replace(/\D/g, ""))));
      
      for (const phone of uniquePhones) {
        const text = `*Announcement from ${settings.institute_name}*\n\n${message}`;
        try {
          await sock.sendMessage(`${phone}@s.whatsapp.net`, { text });
          logMessage(userId, "outgoing", phone, text);
          sentCount++;
        } catch (e) {
          console.error("Failed to send to", phone, e);
        }
        // Small delay
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
