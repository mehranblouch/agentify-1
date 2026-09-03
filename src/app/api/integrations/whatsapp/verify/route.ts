import { NextResponse } from "next/server";
import { getWhatsAppSession, isSessionRegistered, isSocketConnected } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phoneNumber } = body as { phoneNumber?: string };
    
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number required" },
        { status: 400 }
      );
    }

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    
    console.log(`[Verify] Checking connection for ${cleanNumber}...`);

    if (!isSessionRegistered(cleanNumber)) {
      console.log(`[Verify] No registered session found for ${cleanNumber}`);
      return NextResponse.json({
        success: false,
        connected: false,
        error: "Pairing not completed. Please scan the QR code or enter the pairing code on your phone.",
        retryable: true
      });
    }

    console.log(`[Verify] Registered session found, getting session for ${cleanNumber}...`);

    try {
      const sock = await getWhatsAppSession(cleanNumber);
      
      if (!sock) {
        return NextResponse.json({
          success: false,
          connected: false,
          error: "Failed to initialize session",
          retryable: true
        });
      }

      const connected = isSocketConnected(sock);

      if (connected) {
        console.log(`✨ [Verify] Connected for ${cleanNumber}`);
        return NextResponse.json({
          success: true,
          connected: true,
          message: "WhatsApp connected successfully!",
          phoneNumber: cleanNumber,
          user: sock.user,
          provider: "baileys"
        });
      }

      return NextResponse.json({
        success: false,
        connected: false,
        error: "Still establishing connection...",
        retryable: true
      });

    } catch (err: any) {
      console.error(`[Verify] Error for ${cleanNumber}:`, err.message);
      return NextResponse.json({
        success: false,
        connected: false,
        error: err.message || "Failed to verify connection",
        retryable: true
      });
    }
  } catch (error: unknown) {
    console.error("❌ Verify Error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
