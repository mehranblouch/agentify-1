import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { saveStudentsBulk } from "@/lib/services/sqlite-store";

const MAX_ROWS = 5000;
const MAX_NAME = 120;
const MAX_PHONE = 30;
const MAX_FATHER = 120;

interface ImportRow {
  name: string;
  father_name: string;
  phone: string;
}

const clean = (v: unknown) => String(v ?? "").trim().slice(0, MAX_NAME);

export async function POST(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId)
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const body = await req.json();
    const rows: ImportRow[] = Array.isArray(body?.students) ? body.students : [];

    if (rows.length === 0)
      return NextResponse.json({ success: false, error: "No students provided" }, { status: 400 });
    if (rows.length > MAX_ROWS)
      return NextResponse.json(
        { success: false, error: `Max ${MAX_ROWS} rows per import` },
        { status: 400 }
      );

    const sanitised: ImportRow[] = rows.map((r) => ({
      name: clean(r.name).slice(0, MAX_NAME),
      father_name: clean(r.father_name).slice(0, MAX_FATHER),
      phone: String(r.phone ?? "")
        .trim()
        .slice(0, MAX_PHONE),
    }));

    const result = saveStudentsBulk(userId, sanitised);

    return NextResponse.json({
      success: true,
      added: result.added,
      duplicates: result.duplicates,
      skipped: result.skipped,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
