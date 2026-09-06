import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "clinic.sqlite");

/**
 * GET /api/admin/backup -> download a copy of the current database.
 * POST /api/admin/restore-db -> upload a SQLite file, replacing the current DB.
 * Both require a valid admin session.
 */

export async function GET(req: Request) {
  const guarded = requireAdminSession(req);
  if ("error" in guarded) return guarded.error;

  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ success: false, error: "No database file found" }, { status: 404 });
    }
    const bytes = fs.readFileSync(DB_PATH);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="clinic.sqlite"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guarded = requireAdminSession(req);
  if ("error" in guarded) return guarded.error;

  try {
    const buf = Buffer.from(await req.arrayBuffer());
    const magic = "SQLite format 3\u0000";
    if (buf.length < magic.length || buf.subarray(0, magic.length).toString("latin1") !== magic) {
      return NextResponse.json({ success: false, error: "Not a valid SQLite database file" }, { status: 400 });
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });

    try {
      if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, `${DB_PATH}.pre-restore`);
    } catch {}

    fs.writeFileSync(DB_PATH, buf);

    return NextResponse.json({
      success: true,
      message: "Database restored. Restart the service (not a redeploy) to load it.",
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}