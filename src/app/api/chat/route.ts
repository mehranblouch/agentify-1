import { NextResponse } from 'next/server';
import { getAIResponse } from '@/lib/ai';

export async function POST(req: Request) {
  let sessionId = 'unknown';
  try {
    const body = await req.json();
    sessionId = body.sessionId || sessionId;
    const { message, history, businessData, provider = 'gemini', globalRules } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const reply = await getAIResponse(
      message, 
      history || [], 
      provider, 
      businessData,
      sessionId,
      globalRules
    );

    return NextResponse.json({ reply, sessionId });

  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json({ 
      reply: `[Demo Mode] Error: ${message}. Simulated reply: Yes, Dr. Ahmed is available at 4:30 PM.`,
      sessionId 
    });
  }
}

