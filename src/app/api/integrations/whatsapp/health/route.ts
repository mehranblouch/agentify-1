import { NextResponse } from "next/server";
import { isSessionRegistered, isSocketConnected, getWhatsAppSession, getCanonicalSessionNumber, bootstrapAllSessions } from "@/lib/whatsapp";

/**
 * GET /api/integrations/whatsapp/health?phone=923001234567
 */
export async function GET(request: Request) {
  try {
    await bootstrapAllSessions();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ connected: false, error: "phone query param required" });
    }

    const cleanPhone = getCanonicalSessionNumber(phone);
    const isPairing = (global as any).whatsappPairing?.has(cleanPhone);
    const isRegistered = isSessionRegistered(cleanPhone);

    let sock = (global as any).whatsappSessions?.get(cleanPhone);
    if (!sock && isRegistered && !isPairing) {
      try { sock = await getWhatsAppSession(cleanPhone); } catch {}
    }

    const connected = isRegistered && !isPairing;

    return NextResponse.json({
      connected,
      paired: isRegistered,
      socketOpen: isSocketConnected(sock),
      userId: sock?.user?.id,
      phone: cleanPhone,
    });
  } catch (error) {
    return NextResponse.json({ connected: false, error: "Health check failed" });
  }
}
