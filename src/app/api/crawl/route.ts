import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Crawler: Fetching ${url}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentifyBot/1.0; +http://agentfy.ai/bot)'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
    }

    const html = await response.text();

    // Basic extraction logic: 
    // 1. Remove scripts and styles
    let cleanText = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");

    // 2. Extract text from tags
    cleanText = cleanText.replace(/<[^>]+>/g, " ");

    // 3. Normalize whitespace
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    // 4. Limit length for AI context
    const finalText = cleanText.substring(0, 10000);

    return NextResponse.json({ 
      success: true, 
      content: finalText,
      metadata: {
        title: url.split('/').pop() || url,
        length: finalText.length
      }
    });

  } catch (err) {
    console.error("Crawler Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
