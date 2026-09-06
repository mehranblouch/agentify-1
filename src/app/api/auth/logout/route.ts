import { NextResponse } from "next/server";
import { destroyCurrentSession, clearSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    destroyCurrentSession(req);
    const res = NextResponse.json({ success: true });
    clearSessionCookie(res);
    return res;
  } catch {
    return NextResponse.json({ success: true });
  }
}