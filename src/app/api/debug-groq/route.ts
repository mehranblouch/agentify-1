import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function GET() {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY undefined" });

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say hello!" }],
      model: "groq/compound",
    });

    return NextResponse.json({ success: true, response: completion.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
