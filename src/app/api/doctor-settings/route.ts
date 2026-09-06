import { NextResponse } from "next/server";
import { getClinicSettings, saveClinicSettings } from "@/lib/services/sqlite-store";
import { requireSession } from "@/lib/auth";
import type { ClinicSettings } from "@/lib/services/sqlite-store";

const CLINIC_FIELDS: (keyof ClinicSettings)[] = [
  "clinic_name",
  "consultation_fee",
  "slot_duration_mins",
  "daily_quota",
  "start_time",
  "end_time",
  "custom_rules",
  "whatsapp_number",
  "location",
  "timings",
  "google_sheet_id",
];

function pickClinicFields(body: Record<string, unknown>): Partial<ClinicSettings> {
  const out: Partial<ClinicSettings> = {};
  for (const field of CLINIC_FIELDS) {
    if (body[field] !== undefined) (out as Record<string, unknown>)[field] = body[field];
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const data = getClinicSettings(userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET doctor-settings error:", error);
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
    const allowed = pickClinicFields(body || {});
    const saved = saveClinicSettings({ ...allowed, user_id: userId });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("POST doctor-settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}