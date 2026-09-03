import { NextResponse } from "next/server";
import { getWhatsAppSession } from "@/lib/whatsapp";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phone");

    if (!phoneNumber) {
      return NextResponse.json({
        error: "Phone number required",
        example: "/api/integrations/whatsapp/debug?phone=923051510206"
      });
    }

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    const authDir = path.join(process.cwd(), "sessions", cleanNumber);
    const credsPath = path.join(authDir, "creds.json");

    console.log(`\n[DEBUG] Checking WhatsApp connection for ${cleanNumber}\n`);

    const debugInfo: any = {
      phoneNumber: cleanNumber,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check 1: Credentials exist
    debugInfo.checks.credentialsExist = fs.existsSync(credsPath);
    console.log(`✓ Credentials exist: ${debugInfo.checks.credentialsExist}`);

    if (!debugInfo.checks.credentialsExist) {
      debugInfo.checks.error = "No credentials found - pairing not completed";
      return NextResponse.json(debugInfo);
    }

    // Check 2: Try to get session
    try {
      console.log(`Getting session...`);
      const sock = await getWhatsAppSession(cleanNumber);
      debugInfo.checks.socketCreated = !!sock;
      console.log(`✓ Socket created: ${!!sock}`);

      if (sock) {
        // Check 3: Connection state
        const connectionState = (sock as any).connectionState;
        debugInfo.checks.connectionState = connectionState;
        console.log(`✓ Connection state:`, connectionState);

        // Check 4: User info
        debugInfo.checks.user = {
          exists: !!sock.user,
          id: sock.user?.id || null,
          jid: sock.user?.jid || null,
          verifiedName: sock.user?.verifiedName || null
        };
        console.log(`✓ User info:`, debugInfo.checks.user);

        // Check 5: Socket properties
        debugInfo.checks.socket = {
          hasAuthHandler: !!sock.ev,
          wsReady: sock.ws?.readyState === 1 ? "OPEN" : (sock.ws?.readyState === 0 ? "CONNECTING" : "CLOSED"),
        };
        console.log(`✓ Socket properties:`, debugInfo.checks.socket);

        // Check 6: Sessions in global memory
        const globalSessions = (global as any).whatsappSessions;
        debugInfo.checks.globalSessions = {
          exists: !!globalSessions,
          hasPhone: globalSessions?.has(cleanNumber),
          sessionActive: globalSessions?.get(cleanNumber) ? "yes" : "no"
        };
        console.log(`✓ Global sessions:`, debugInfo.checks.globalSessions);

        // Overall status
        const isConnected = connectionState?.status === "open" && !!sock.user?.id;
        debugInfo.status = isConnected ? "CONNECTED" : "NOT_CONNECTED";
        debugInfo.recommendation = isConnected 
          ? "✅ Connection is working!"
          : `⚠️ Connection not ready. Status: ${connectionState?.status}`;

      }
    } catch (err: any) {
      debugInfo.checks.error = err.message;
      console.error(`✗ Error getting session:`, err.message);
    }

    console.log(`\n[DEBUG] Final status: ${debugInfo.status}\n`);

    return NextResponse.json(debugInfo);
  } catch (error: unknown) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Debug failed" },
      { status: 500 }
    );
  }
}
