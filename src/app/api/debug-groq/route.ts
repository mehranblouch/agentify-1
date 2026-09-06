import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireAdminSession } from "@/lib/auth";

export async function GET(req: Request) {
  const guarded = requireAdminSession(req);
  if ("error" in guarded) return guarded.error;
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY undefined" });

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say hello!" }],
      model: "groq/compound",
      max_tokens: 512,
    });

    return NextResponse.json({ success: true, response: completion.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
