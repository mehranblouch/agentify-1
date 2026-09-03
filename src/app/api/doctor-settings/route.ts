import { NextResponse } from "next/server";
import { getClinicSettings, saveClinicSettings } from "@/lib/services/sqlite-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "default";
    const data = getClinicSettings(userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET doctor-settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.user_id || "default";
    const saved = saveClinicSettings({ ...body, user_id: userId });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("POST doctor-settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
