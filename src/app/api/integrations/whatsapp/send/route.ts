import { NextResponse } from "next/server";
import { getWhatsAppSession } from "@/lib/whatsapp";
import { logMessage } from "@/lib/services/sqlite-store";

// POST: Send a single outbound WhatsApp message via Baileys
// Called by the Workflow Executor for bulk campaigns
export async function POST(req: Request) {
  try {
    const { phone, message, fromNumber } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: "phone and message are required" }, { status: 400 });
    }

    // Get or reuse the active WhatsApp session (Baileys powered)
    // fromNumber = the business WhatsApp number that is connected
    const sessionPhone = fromNumber || process.env.WHATSAPP_DEFAULT_NUMBER || "";

    if (!sessionPhone) {
      return NextResponse.json({ 
        error: "No WhatsApp session configured. Please connect WhatsApp first." 
      }, { status: 400 });
    }

    // Initialize Baileys socket
    const sock = await getWhatsAppSession(sessionPhone);

    if (!sock || !sock.user) {
      return NextResponse.json({ 
        error: "WhatsApp session not active via Baileys. Please re-link." 
      }, { status: 503 });
    }

    // Clean and format phone number to WhatsApp JID
    const cleanPhone = phone.replace(/\D/g, "");
    const jid = `${cleanPhone}@s.whatsapp.net`;

    // Look up userId from SQLite (works after server restart)
    const cleanFrom = sessionPhone.replace(/\D/g, "");
    const { getUserByWhatsAppNumber } = await import("@/lib/services/sqlite-store");
    const biz = getUserByWhatsAppNumber(cleanFrom);
    const userId = biz?.userId || "";

    console.log(`📤 Sending via Baileys to ${cleanPhone}: "${message.substring(0, 50)}..."`);

    try {
      // Simulate human typing behavior
      await sock.sendPresenceUpdate("composing", jid);
      
      // Random delay before sending (2-4 seconds)
      const delay = Math.floor(Math.random() * 2000) + 2000;
      await new Promise(r => setTimeout(r, delay));

      // Send message via Baileys
      const result = await sock.sendMessage(jid, { text: message });
      
      await sock.sendPresenceUpdate("paused", jid);

      if (userId) logMessage(userId, "outgoing", cleanPhone, message);

      console.log(`✅ [Baileys] Message sent to ${cleanPhone} - Message ID: ${result.key?.id}`);

      return NextResponse.json({ 
        success: true, 
        to: cleanPhone,
        messageId: result.key?.id,
        provider: "baileys"
      });

    } catch (sendErr: any) {
      console.error("❌ Baileys send error:", sendErr.message);
      
      // Attempt one retry after 1 second
      console.log("🔁 Attempting retry via Baileys...");
      try {
        await new Promise(r => setTimeout(r, 1000));
        const retryResult = await sock.sendMessage(jid, { text: message });
        await sock.sendPresenceUpdate("paused", jid);
        
        if (userId) logMessage(userId, "outgoing", cleanPhone, message);
        
        console.log(`✅ [Baileys Retry] Message sent to ${cleanPhone}`);
        return NextResponse.json({ 
          success: true, 
          to: cleanPhone,
          messageId: retryResult.key?.id,
          provider: "baileys",
          retried: true
        });
      } catch (retryErr: any) {
        console.error("❌ Baileys retry failed:", retryErr.message);
        return NextResponse.json({ 
          error: `Failed to send via Baileys after retry: ${retryErr.message}` 
        }, { status: 500 });
      }
    }

  } catch (err: unknown) {
    console.error("❌ WhatsApp Send Error:", err);
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
