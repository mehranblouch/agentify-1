import { NextResponse } from "next/server";
import { createQRSocket, normalizePhoneNumber } from "@/lib/whatsapp";
import { assignWhatsAppNumberToBusiness } from "@/lib/services/sqlite-store";

export const maxDuration = 60;

/**
 * POST /api/integrations/whatsapp/qrcode
 * Body: { phoneNumber, userId?, businessType? }
 * Returns { success: true, qrString }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phoneNumber, userId, businessType } = body as {
      phoneNumber?: string;
      userId?: string;
      businessType?: string;
    };

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: "Phone number required" }, { status: 400 });
    }

    const cleanNumber = normalizePhoneNumber(phoneNumber);
    if (cleanNumber.length < 7) {
      return NextResponse.json({ success: false, error: "Invalid phone number" }, { status: 400 });
    }

    // Persist phone number in SQLite so business lookup works after restart
    if (userId) {
      const bType = (businessType as "clinic" | "education") || "clinic";
      assignWhatsAppNumberToBusiness(userId, bType, cleanNumber);
      console.log(`[QR Route] Persisted whatsapp_number=${cleanNumber} for userId=${userId} type=${bType}`);
    }

    console.log(`[QR Route] Generating QR for ${cleanNumber}`);
    const { qrString } = await createQRSocket(cleanNumber);
    console.log(`[QR Route] ✅ QR ready for ${cleanNumber}`);

    return NextResponse.json({ success: true, qrString });
  } catch (e: any) {
    console.error("[QR Route] Error:", e.message);
    return NextResponse.json({ success: false, error: e.message ?? "Failed to generate QR" }, { status: 500 });
  }
}
