import { NextResponse } from "next/server";
import { getEducationSettings, saveEducationSettings } from "@/lib/services/sqlite-store";
import { requireSession } from "@/lib/auth";
import type { EducationSettings } from "@/lib/services/sqlite-store";

const EDUCATION_FIELDS: (keyof EducationSettings)[] = [
  "institute_name",
  "address",
  "timings",
  "info_box",
  "whatsapp_number",
];

function pickEducationFields(body: Record<string, unknown>): Partial<EducationSettings> {
  const out: Partial<EducationSettings> = {};
  for (const field of EDUCATION_FIELDS) {
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

    const settings = getEducationSettings(userId);
    return NextResponse.json({ success: true, data: settings });
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
    const allowed = pickEducationFields(body || {});
    const saved = saveEducationSettings({ ...allowed, user_id: userId });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}