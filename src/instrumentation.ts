export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("[Server Startup] Bootstrapping WhatsApp sessions...");
      const { bootstrapAllSessions } = await import("./lib/whatsapp");
      await bootstrapAllSessions();
    } catch (err: any) {
      console.warn("[Server Startup] WhatsApp bootstrap error:", err?.message || err);
    }
  }
}
