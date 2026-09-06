import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = resolveRequestSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  return NextResponse.json({ success: true, role: "admin" });
}