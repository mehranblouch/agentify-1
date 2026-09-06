import { NextResponse } from "next/server";
import { createPairingSocket, normalizePhoneNumber } from "@/lib/whatsapp";
import { assignWhatsAppNumberToBusiness } from "@/lib/services/sqlite-store";
import { requireSession } from "@/lib/auth";

export const maxDuration = 60;

/**
 * POST /api/integrations/whatsapp
 * Body: { phoneNumber, businessType? }
 * Returns { success: true, pairingCode }
 */
export async function POST(request: Request) {
  try {
    const guarded = requireSession(request);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { phoneNumber, businessType } = body as {
      phoneNumber?: string;
      businessType?: string;
    };

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: "Phone number required" }, { status: 400 });
    }

    const cleanNumber = normalizePhoneNumber(phoneNumber);
    if (cleanNumber.length < 7) {
      return NextResponse.json({ success: false, error: "Invalid phone number" }, { status: 400 });
    }

    // Persist phone number in SQLite so business lookup works after restart.
    // userId always comes from the authenticated session, never the request body.
    const bType = (businessType as "clinic" | "education") || "clinic";
    assignWhatsAppNumberToBusiness(userId, bType, cleanNumber);
    console.log(`[Pair Route] Persisted whatsapp_number=${cleanNumber} for userId=${userId} type=${bType}`);

    console.log(`[Pair Route] Starting pairing for ${cleanNumber} user=${userId}`);

    const { pairingCode } = await createPairingSocket(cleanNumber);

    return NextResponse.json({ success: true, pairingCode });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to initialize WhatsApp session";
    console.error("❌ WhatsApp Pairing Route Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
