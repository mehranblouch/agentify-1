import { NextResponse } from "next/server";
import { getWhatsAppSession, isSessionRegistered, isSocketConnected, getCanonicalSessionNumber } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phoneNumber } = body as { phoneNumber?: string };

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: "Phone number required" }, { status: 400 });
    }

    const cleanNumber = getCanonicalSessionNumber(phoneNumber);

    console.log(`[Confirm] Polling for registered creds: ${cleanNumber}`);

    let isRegistered = false;
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts; i++) {
      isRegistered = isSessionRegistered(cleanNumber);
      if (isRegistered) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!isRegistered) {
      console.log(`[Confirm] Not registered after ${maxAttempts}s for ${cleanNumber}`);
      return NextResponse.json(
        { success: false, paired: false, error: "Pairing code not entered or expired. Please try again." },
        { status: 408 }
      );
    }

    console.log(`[Confirm] ✅ Credentials confirmed for ${cleanNumber}`);

    const sock = await getWhatsAppSession(cleanNumber);
    const connected = isSocketConnected(sock);

    return NextResponse.json({
      success: true,
      paired: true,
      connected,
      message: connected ? "✅ WhatsApp connected successfully!" : "Pairing successful — establishing session...",
      phoneNumber: cleanNumber,
      user: sock?.user,
      provider: "baileys",
    });
  } catch (error: unknown) {
    console.error("❌ Pairing Confirmation Error:", error);
    const message = error instanceof Error ? error.message : "Confirmation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
