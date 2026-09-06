import { NextResponse } from "next/server";
import { getAttendanceLogs, markAttendance } from "@/lib/services/sqlite-store";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ success: false, error: "Missing date" }, { status: 400 });

    const logs = getAttendanceLogs(userId, date);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const body = await req.json();
    const { student_id, date, status } = body;
    if (!student_id || !date || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const saved = markAttendance(userId, student_id, date, status);
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}