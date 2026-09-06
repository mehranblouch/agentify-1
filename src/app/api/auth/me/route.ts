import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/auth";
import { getUserById } from "@/lib/services/sqlite-store";

export async function GET(req: Request) {
  const session = resolveRequestSession(req);
  if (!session || !session.userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const user = getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    id: user.id,
    email: user.email,
    name: user.name,
    business_type: user.business_type,
  });
}