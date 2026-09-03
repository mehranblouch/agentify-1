import { NextResponse } from "next/server";
import { getEducationSettings, saveEducationSettings } from "@/lib/services/sqlite-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    
    const settings = getEducationSettings(userId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.user_id;
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });

    const saved = saveEducationSettings({ ...body, user_id: userId });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
