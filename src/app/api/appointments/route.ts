import { NextResponse } from "next/server";
import { getAllAppointments } from "@/lib/services/sqlite-store";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || undefined;
    const appointments = getAllAppointments(userId, phone || undefined);
    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}