import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "clinic.sqlite");

function getDb() {
  return new Database(DB_PATH);
}

export async function GET(req: Request) {
  const db = getDb();
  try {
    const { searchParams } = new URL(req.url);
    const singleUserId = searchParams.get("userId");

    // Single-business pause lookup (used by the dashboard banner)
    if (singleUserId) {
      const row = db.prepare("SELECT id, paused FROM users WHERE id = ?").get(singleUserId) as any;
      if (!row) {
        return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, userId: row.id, paused: !!row.paused });
    }

    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.business_type, u.created_at, u.paused,
                COALESCE(c.clinic_name, e.institute_name) as business_name,
                COALESCE(c.whatsapp_number, e.whatsapp_number) as whatsapp_number
         FROM users u
         LEFT JOIN clinic_settings c ON c.user_id = u.id
         LEFT JOIN education_settings e ON e.user_id = u.id
         ORDER BY u.created_at DESC`
      )
      .all() as any[];

    const businesses = rows.map((r: any) => {
      const msgStats = db
        .prepare(
          `SELECT
             SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
             SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
           FROM message_logs WHERE user_id = ?`
        )
        .get(r.id) as any;
      const tokenRow = db
        .prepare(
          `SELECT SUM(total_tokens) as total FROM groq_key_usage_per_user WHERE user_id = ?`
        )
        .get(r.id) as any;
      return {
        ...r,
        messages_incoming: msgStats?.incoming || 0,
        messages_outgoing: msgStats?.outgoing || 0,
        token_used: Math.round(tokenRow?.total || 0),
      };
    });

    return NextResponse.json({ success: true, businesses });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function PATCH(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const userId = body.userId;
  if (!userId) {
    return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const paused = body.paused ? 1 : 0;
    const info = db.prepare("UPDATE users SET paused = ? WHERE id = ?").run(paused, userId);
    if (info.changes === 0) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, paused: !!body.paused });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
  }

  const db = getDb();
  try {
    db.prepare("DELETE FROM message_logs WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM appointments WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM attendance_logs WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM students WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM clinic_settings WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM education_settings WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    const cleanPhone = searchParams.get("phone")?.replace(/\D/g, "");
    if (cleanPhone) {
      const sock = (global as any).whatsappSessions?.get(cleanPhone);
      if (sock) {
        try { sock.end?.(); } catch {}
        (global as any).whatsappSessions?.delete(cleanPhone);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    db.close();
  }
}
