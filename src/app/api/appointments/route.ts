import { NextResponse } from "next/server";
import { getAllAppointments } from "@/lib/services/sqlite-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }
    const phone = searchParams.get("phone") || undefined;
    const appointments = getAllAppointments(userId, phone || undefined);
    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
