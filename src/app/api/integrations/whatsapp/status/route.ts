import { NextResponse } from "next/server";
import { isSessionRegistered, isSocketConnected, getCanonicalSessionNumber, bootstrapAllSessions, SESSIONS_DIR } from "@/lib/whatsapp";
import { getClinicSettings } from "@/lib/services/sqlite-store";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    // Bootstrap all sessions on first status check (restores after server restart)
    await bootstrapAllSessions();

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const userId = searchParams.get("userId");

    let targetPhone = phone ? getCanonicalSessionNumber(phone) : "";

    // Auto-discover: find the registered session for this user
    if (!targetPhone && userId) {
      const clinic = getClinicSettings(userId);
      if (clinic?.whatsapp_number) targetPhone = getCanonicalSessionNumber(clinic.whatsapp_number);
    }

    // Auto-discover: any registered session on disk
    if (!targetPhone) {
      if (fs.existsSync(SESSIONS_DIR)) {
        for (const entry of fs.readdirSync(SESSIONS_DIR)) {
          if (isSessionRegistered(entry)) { targetPhone = entry; break; }
        }
      }
    }

    if (!targetPhone) {
      return NextResponse.json({ connected: false });
    }

    const isPairing = (global as any).whatsappPairing?.has(targetPhone);
    const isRegistered = isSessionRegistered(targetPhone);

    // Never create a new WA socket from a status poll — bootstrapAllSessions()
    // already restores sockets in the background. Creating sockets here on every
    // poll (10s) when disconnected is expensive and slows down all API requests.
    const session = (global as any).whatsappSessions?.get(targetPhone);

    // Connected = a live, open socket — NOT merely credentials existing on disk.
    // If the user disconnected WhatsApp from their phone, the socket closes and
    // this correctly reports connected:false.
    const socketConnected = isSocketConnected(session);
    const connected = socketConnected && isRegistered && !isPairing;

    return NextResponse.json({
      connected,
      registered: isRegistered,
      socketConnected,
      phone: targetPhone,
    });
  } catch (error) {
    return NextResponse.json({ connected: false, error: "Status check failed" });
  }
}
