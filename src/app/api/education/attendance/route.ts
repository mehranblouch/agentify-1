import { NextResponse } from "next/server";
import { getAttendanceLogs, markAttendance } from "@/lib/services/sqlite-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");
    if (!userId || !date) return NextResponse.json({ success: false, error: "Missing userId or date" }, { status: 400 });
    
    const logs = getAttendanceLogs(userId, date);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, student_id, date, status } = body;
    if (!user_id || !student_id || !date || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const saved = markAttendance(user_id, student_id, date, status);
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
