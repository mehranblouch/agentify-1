import Groq from "groq-sdk";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { recordGroqKeyCall } from "./services/sqlite-store";
const RETRYABLE_STATUSES = [429, 403, 500, 502, 503, 504];

function isRetryable(err: any): boolean {
  if (RETRYABLE_STATUSES.includes(err?.status)) return true;
  if (RETRYABLE_STATUSES.includes(err?.statusCode)) return true;
  if (err?.message?.includes("rate_limit")) return true;
  if (err?.message?.includes("quota")) return true;
  if (err?.message?.includes("tokens")) return true;
  if (err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT") return true;
  return false;
}

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
  ].filter(Boolean) as string[];
}

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

async function tryGroqText(messages: any[], model: string): Promise<string> {
  const keys = getGroqKeys();
  const keyLabels = ["primary", "key 2", "key 3"].slice(0, keys.length);
  if (keys.length === 0) throw new Error("No Groq API keys configured");
  let lastError: any;
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] });
      const completion = await groq.chat.completions.create({ messages, model } as any);
      if (i > 0) console.log(`Groq ${keyLabels[i]} succeeded after ${keyLabels[0]} hit a limit`);
      try {
        recordGroqKeyCall(i, keyLabels[i], {
          prompt_tokens: completion.usage?.prompt_tokens,
          completion_tokens: completion.usage?.completion_tokens,
          total_tokens: completion.usage?.total_tokens,
        });
      } catch {}
      return completion.choices[0]?.message?.content || "No response generated.";
    } catch (err: any) {
      lastError = err;
      const code = err?.status || err?.statusCode || err?.code || "";
      console.warn(`Groq ${keyLabels[i]} failed (${code}), trying next key...`);
      if (isRetryable(err) && i < keys.length - 1) continue;
      if (i === keys.length - 1) break;
      throw err;
    }
  }
  throw lastError || new Error("All Groq API keys exhausted");
}

async function tryGeminiText(systemPrompt: string, formattedHistory: any[], message: string): Promise<string> {
  const keys = getGeminiKeys();
  const keyLabels = ["primary", "key 2", "key 3"].slice(0, keys.length);
  if (keys.length === 0) throw new Error("No Gemini API keys configured");
  let lastError: any;
  for (let i = 0; i < keys.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(keys[i]);
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: `SYSTEM INSTRUCTIONS: ${systemPrompt}` }] },
          { role: "model", parts: [{ text: "Understood. I will follow all instructions precisely." }] },
          ...formattedHistory.map((msg: any) => ({
            role: (msg.role === 'assistant' ? 'model' : 'user') as "model" | "user",
            parts: [{ text: String(msg.content) }]
          }))
        ],
      });
      const result = await chat.sendMessage(message);
      if (i > 0) console.log(`Gemini ${keyLabels[i]} succeeded after ${keyLabels[0]} hit a limit`);
      return result.response.text();
    } catch (err: any) {
      lastError = err;
      const code = err?.status || err?.statusCode || err?.code || "";
      console.warn(`Gemini ${keyLabels[i]} failed (${code}), trying next key...`);
      if (isRetryable(err) && i < keys.length - 1) continue;
      if (i === keys.length - 1) break;
      throw err;
    }
  }
  throw lastError || new Error("All Gemini keys exhausted");
}

export async function getAIResponse(
  message: string,
  history: any[] = [],
  provider: string = 'gemini',
  businessData?: any,
  sessionId?: string,
  globalRulesOverrides?: { knowledge?: string, commands?: string }
) {
  if (!businessData || !businessData.name) {
    return "This AI agent is not configured yet. Please complete the business setup in the dashboard.";
  }

  const resolvedData = {
    name: businessData.name || "",
    type: businessData.type || "general",
    city: businessData.city || "",
    phone: businessData.phone || "",
    language: businessData.language || "english",
    hours: businessData.hours || "",
    services: typeof businessData.services === 'string'
      ? businessData.services
      : JSON.stringify(businessData.services || []),
    faq: typeof businessData.faq === 'string'
      ? businessData.faq
      : JSON.stringify(businessData.faq || []),
    rules: businessData.rules || "",
    knowledge: businessData.knowledge || "",
    commands: businessData.commands || "",
    workflowInstructions: businessData.workflowInstructions || ""
  };

  const systemPrompt = `
You are a smart, conversational AI assistant for ${resolvedData.name}.

LANGUAGE: Reply natively in ${resolvedData.language} based on user's language.

---
KNOWLEDGE BASE (use this as reference — do NOT recite it all):

Business Type: ${resolvedData.type}
Location: ${resolvedData.city}
Phone: ${resolvedData.phone}
Working Hours: ${resolvedData.hours}
Services: ${resolvedData.services}
FAQs: ${resolvedData.faq}
Rules & Policies: ${resolvedData.rules}
Additional Knowledge: ${resolvedData.knowledge || "None"}

---
AUTOMATION COMMANDS:
${resolvedData.commands || resolvedData.workflowInstructions || `
- If a customer asks to book an appointment: collect their Name, Phone Number, and Preferred Date. Confirm with: "Thank you {name}, your appointment is confirmed for {date}. We will call you at {phone}."
- If a customer asks about their order or status, ask for their order ID.
- If you cannot answer, say: "I don't have that information right now. Please call us at ${resolvedData.phone}."
`}

INSTRUCTIONS:
1. You are a smart reasoning agent. Read the user's message carefully and infer what they are asking.
2. Use the KNOWLEDGE BASE to formulate your answer. DO NOT dump or list all the information. Only provide what is relevant to the user's specific inquiry.
3. If the user asks a question that is NOT covered in your knowledge base (e.g., asking for a specific person's name or a product not mentioned), politely inform them that you don't have that specific information and offer to help with something else or suggest they contact the business directly. Do not hallucinate or make things up.
4. Keep your replies SHORT, NATURAL, and CONVERSATIONAL. Be warm and helpful, and use emojis occasionally.
  `;

  let reply = "";

  const formattedHistory = history.map((msg: any) => ({
    role: (msg.role === 'assistant' ? 'assistant' : 'user') as "assistant" | "user",
    content: String(msg.content)
  }));

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...formattedHistory,
    { role: "user" as const, content: message }
  ];

  try {
    if (provider === 'groq') {
      try {
        reply = await tryGroqText(messages, "groq/compound");
      } catch (groqErr) {
        console.warn("Groq failed, falling back to Gemini:", (groqErr as any)?.message);
        reply = await tryGeminiText(systemPrompt, formattedHistory, message);
      }
    } else {
      // Gemini is the primary (and preferred) provider
      reply = await tryGeminiText(systemPrompt, formattedHistory, message);
    }
  } catch (err: any) {
    console.error("All AI providers failed:", err.message);
    reply = `I'm sorry, our AI service is temporarily unavailable. Please try again later.`;
  }

  return reply;
}
