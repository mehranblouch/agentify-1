import { NextResponse } from "next/server";
import { verifyAdminPassword, issueSession, setSessionCookie, getClientIp } from "@/lib/auth";

// Simple in-memory throttle for the admin gate (admin is a single account).
const attempts = new Map<string, { count: number; until: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body || {};
    const ip = getClientIp(req) || "admin";

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    const rec = attempts.get(ip);
    const now = Date.now();
    if (rec && rec.until > now) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later.", locked: true },
        { status: 429 }
      );
    }
    if (rec && now > rec.until) attempts.delete(ip);

    if (!verifyAdminPassword(password)) {
      const next = attempts.get(ip);
      const count = (next?.count || 0) + 1;
      const until = count >= 5 ? now + 15 * 60 * 1000 : 0;
      attempts.set(ip, { count, until });
      return NextResponse.json(
        { success: false, error: count >= 5 ? "Too many attempts. Try again later." : "Incorrect password", locked: count >= 5 },
        { status: 401 }
      );
    }

    attempts.delete(ip);

    const token = issueSession(null, "admin");
    const res = NextResponse.json({ success: true });
    setSessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}