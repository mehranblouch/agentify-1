import { NextResponse } from "next/server";
import { addContactMessage } from "@/lib/services/sqlite-store";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ success: false, error: "Please enter your name." }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 200) {
      return NextResponse.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
    }
    if (message.length < 10 || message.length > 3000) {
      return NextResponse.json(
        { success: false, error: "Please write a message of at least 10 characters (max 3000)." },
        { status: 400 }
      );
    }

    addContactMessage(name, email, subject.slice(0, 200), message);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}