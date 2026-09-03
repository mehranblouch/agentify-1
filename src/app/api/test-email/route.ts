import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  try {
    const res = await fetch(`https://picasaweb.google.com/data/entry/api/user/${email}?alt=json`);
    return NextResponse.json({ status: res.status, ok: res.ok });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
