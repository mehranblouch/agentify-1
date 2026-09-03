import { NextResponse } from "next/server";
import { getAllGroqKeyUsage, resetGroqKeyUsage } from "@/lib/services/sqlite-store";

const KEY_ENV_NAMES = [
  "GROQ_API_KEY",
  "GROQ_API_KEY1",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
];

export async function GET() {
  try {
    const rows = getAllGroqKeyUsage();
    const keys = KEY_ENV_NAMES.map((envName, i) => {
      const row = rows.find((r) => r.key_index === i);
      return {
        key_index: i,
        env_name: envName,
        label: row?.label || `key ${i + 1}`,
        calls: row?.calls || 0,
        input_tokens: row?.input_tokens || 0,
        output_tokens: row?.output_tokens || 0,
        total_tokens: row?.total_tokens || 0,
        last_used: row?.last_used || null,
      };
    });
    return NextResponse.json({ success: true, keys });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { keyIndex } = await req.json();
    if (typeof keyIndex === "number") {
      resetGroqKeyUsage(keyIndex);
    } else {
      resetGroqKeyUsage();
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
