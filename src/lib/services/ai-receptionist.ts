import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getClinicSettings, getEducationSettings, getAllAppointments, recordGroqKeyCall, type ClinicSettings } from "./sqlite-store";

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

// Plain chat completion — NO tool calling
async function tryGroqChat(
  messages: { role: string; content: string }[],
  model = "qwen/qwen3.8-27b",
  userId?: string
): Promise<string> {
  const keys = getGroqKeys();
  if (keys.length === 0) throw new Error("No Groq API keys configured");
  let lastError: any;
  for (let i = 0; i < keys.length; i++) {
    try {
      const groq = new Groq({ apiKey: keys[i] });
      const result = await groq.chat.completions.create({
        messages: messages as any,
        model,
      });
      const text = result.choices[0]?.message?.content;
      if (text) {
        try {
          recordGroqKeyCall(i, `key ${i + 1}`, {
            prompt_tokens: (result.usage as any)?.prompt_tokens,
            completion_tokens: (result.usage as any)?.completion_tokens,
            total_tokens: (result.usage as any)?.total_tokens,
          }, userId);
        } catch {}
        return text;
      }
      throw new Error("Empty response from Groq");
    } catch (err: any) {
      lastError = err;
      console.warn(`Groq key ${i + 1} failed: ${err?.message}`);
      if (isRetryable(err) && i < keys.length - 1) continue;
    }
  }
  throw lastError || new Error("All Groq API keys exhausted");
}

async function tryGeminiChat(
  systemPrompt: string,
  formattedHistory: { role: string; content: string }[],
  message: string
): Promise<string> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error("No valid Gemini API keys configured");

  for (const apiKey of keys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}` }] },
          { role: "model", parts: [{ text: "Understood. I will act strictly according to these official business instructions." }] },
          ...formattedHistory.map((msg) => ({
            role: msg.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: msg.content }],
          })),
        ],
      });
      const result = await chat.sendMessage(message);
      const text = result.response.text();
      if (text) return text;
    } catch (err: any) {
      console.warn(`Gemini key failed: ${err?.message}`);
    }
  }
  throw new Error("All Gemini keys exhausted");
}

export interface AIResponse {
  message?: string;
  toolCall?: {
    action: string;
    payload: any;
  };
  aiMessage?: string;
}

export function generateBusinessFallbackReply(
  message: string,
  settings: any,
  businessType: "clinic" | "education"
): string {
  // Only used when ALL AI providers fail
  if (businessType === "education") {
    const name = settings.institute_name || "the institute";
    return `Hello! Welcome to ${name} 👋\n\nOur AI assistant is temporarily offline. Please try again shortly, or contact the administration directly.`;
  } else {
    const name = settings.clinic_name || "the clinic";
    return `Hello! Welcome to ${name} 👋\n\nOur AI assistant is temporarily offline. Please try again shortly, or contact the clinic directly.`;
  }
}

function getNowParts(timezone: string): { date: string; time: string; day: string } {
  try {
    const date = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const day = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(new Date());
    const [m, d, y] = date.split("/");
    const hh = time.length === 4 ? `0${time}` : time;
    return { date: `${y}-${m}-${d}`, time: hh, day };
  } catch {
    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().slice(0, 5),
      day: now.toLocaleDateString("en-US", { weekday: "long" }),
    };
  }
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export interface ClinicDayInfo {
  date: string;
  weekday: string;
  bookedTimes: string[];
  freeSlots: string[];
  nextSlot: string | null;
  bookedCount: number;
  slotCount: number;
  full: boolean;
}

function getWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
}

export function timeToMinutes(time: string): number | null {
  const str = String(time ?? "").trim().toUpperCase();
  const m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*$/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  if (hour > 23 || minute > 59) return null;
  const mer = m[3] || "";
  if (mer === "PM" && hour < 12) hour += 12;
  if (mer === "AM" && hour === 12) hour = 0;
  if (hour > 23) return null;
  return hour * 60 + minute;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime12h(time: string): string {
  const mins = timeToMinutes(time);
  if (mins === null) return "";
  const h24 = Math.floor(mins / 60);
  const mm = mins % 60;
  const mer = h24 >= 12 ? "PM" : "AM";
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${String(mm).padStart(2, "0")} ${mer}`;
}

function normalizeTime(time: string): string | null {
  const mins = timeToMinutes(time);
  return mins === null ? null : minutesToTime(mins);
}

function isValidDateStr(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseOperatingHours(clinic: ClinicSettings): { start: number; end: number } {
  let start = timeToMinutes(clinic.start_time);
  let end = timeToMinutes(clinic.end_time);
  if (start === null || end === null || end <= start) {
    const raw = String(clinic.timings || "");
    const m = raw.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)\s*[-–—:toword]+\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)/i);
    if (m) {
      start = timeToMinutes(m[1]);
      end = timeToMinutes(m[2]);
    }
  }
  if (start === null || end === null || end <= start) return { start: 9 * 60, end: 17 * 60 };
  return { start, end };
}

export function getDaySlotInfo(
  userId: string,
  clinic: ClinicSettings,
  date: string,
  now: { date: string; time: string }
): ClinicDayInfo {
  const { start, end } = parseOperatingHours(clinic);
  const slotLen = Math.max(1, Number(clinic.slot_duration_mins) || 30);
  const quota = Math.max(0, Number(clinic.daily_quota) || 10);

  const grid: string[] = [];
  let t = start;
  while (t < end && grid.length < quota) {
    grid.push(minutesToTime(t));
    t += slotLen;
  }

  const appointments = getAllAppointments(userId);
  const dayAppointments = appointments.filter((a) => a.appointment_date === date && a.status !== "cancelled");
  const bookedSet = new Set<string>();
  for (const a of dayAppointments) {
    const n = normalizeTime(a.appointment_time);
    if (n) bookedSet.add(n);
  }

  const nowMins = timeToMinutes(now.time) ?? -1;
  const isToday = date === now.date;
  const freeSlots = grid.filter((g) => {
    const gm = timeToMinutes(g) ?? 0;
    // For today: only show slots that haven't already PASSED (exact time or later is fine — urgency handled by AI)
    return !bookedSet.has(g) && (!isToday || gm >= nowMins);
  });

  const full = dayAppointments.length >= quota || freeSlots.length === 0;

  return {
    date,
    weekday: getWeekday(date),
    bookedTimes: Array.from(bookedSet).sort(),
    freeSlots,
    nextSlot: full ? null : freeSlots[0] ?? null,
    bookedCount: dayAppointments.length,
    slotCount: grid.length,
    full,
  };
}

export function resolveAppointmentSlot(
  clinic: ClinicSettings,
  userId: string,
  date: string,
  preferredTime?: string,
  now?: { date: string; time: string }
): string | null {
  const nowInfo = now ?? getNowParts("Asia/Karachi");
  if (!isValidDateStr(date) || date < nowInfo.date) return null;
  const info = getDaySlotInfo(userId, clinic, date, nowInfo);
  if (info.full) return null;
  if (preferredTime) {
    const n = normalizeTime(preferredTime);
    if (n && info.freeSlots.includes(n)) return n;
  }
  return info.nextSlot;
}

export function findNextDayWithSlot(
  userId: string,
  clinic: ClinicSettings,
  fromDate: string,
  maxDays = 14
): { date: string; slot: string } | null {
  const now = getNowParts("Asia/Karachi");
  for (let i = 1; i <= maxDays; i++) {
    const d = addDays(fromDate, i);
    const info = getDaySlotInfo(userId, clinic, d, now);
    if (!info.full && info.nextSlot) return { date: d, slot: info.nextSlot };
  }
  return null;
}

/**
 * Returns how many minutes until a slot time (today only).
 * Negative means the slot is in the past.
 */
function minutesUntilSlot(slotTime: string, nowTime: string): number {
  const slotMins = timeToMinutes(slotTime) ?? 0;
  const nowMins = timeToMinutes(nowTime) ?? 0;
  return slotMins - nowMins;
}

function buildAvailabilitySummary(userId: string, clinic: ClinicSettings, now: { date: string; time: string }): string {
  const lines: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = addDays(now.date, i);
    const info = getDaySlotInfo(userId, clinic, d, now);
    if (info.full) {
      lines.push(`- ${d} (${info.weekday}): FULLY BOOKED.`);
      continue;
    }
    if (i === 0) {
      // Today — annotate slots that are "urgent" (within 30 min)
      const annotatedSlots = info.freeSlots.map((s) => {
        const diff = minutesUntilSlot(s, now.time);
        if (diff >= 0 && diff <= 30) {
          return `${formatTime12h(s)} ⚡URGENT(${diff} min away)`;
        }
        return formatTime12h(s);
      });
      if (info.freeSlots.length <= 8) {
        lines.push(`- TODAY (${d}, ${info.weekday}), current time is ${now.time}: earliest bookable slot is ${formatTime12h(info.nextSlot!)}. Free slots today: ${annotatedSlots.join(", ")}.`);
      } else {
        lines.push(`- TODAY (${d}, ${info.weekday}), current time is ${now.time}: earliest bookable slot is ${formatTime12h(info.nextSlot!)} (${info.freeSlots.length} free slots remaining).`);
      }
      continue;
    }
    const label = `${d} (${info.weekday})`;
    if (i <= 2 && info.freeSlots.length <= 8) {
      lines.push(`- ${label}: free slots ${info.freeSlots.map(formatTime12h).join(", ")}.`);
    } else if (info.nextSlot) {
      lines.push(`- ${label}: next free slot ${formatTime12h(info.nextSlot)} (${info.freeSlots.length} free).`);
    } else {
      lines.push(`- ${label}: no free slots.`);
    }
  }
  return lines.join("\n");
}

/**
 * Pick a random greeting variation so the bot doesn't sound robotic.
 * Includes the clinic name so the patient knows immediately who they're talking to.
 */
function randomGreetingHint(clinicName: string): string {
  const greetings = [
    `Assalam o Alaikum! 👋 This is ${clinicName} — lovely to hear from you! How can I help you today?`,
    `Hello there! 😊 You've reached ${clinicName}. What can I do for you?`,
    `Hi! Welcome to ${clinicName} 🌟 — how may I assist you?`,
    `Good to see you! This is ${clinicName} speaking. 😊 How can we help?`,
    `Hey! 👋 You're chatting with ${clinicName}. Tell me, how can I help you today?`,
    `Salaam! Welcome to ${clinicName} — hope you're doing well! 😊 What do you need help with?`,
    `Hello! 👋 ${clinicName} here — always happy to help. What's on your mind?`,
    `Hi there, welcome! 🌿 You're connected with ${clinicName}. How can we be of service today?`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export async function processReceptionistAI(
  message: string,
  userId: string,
  businessType: "clinic" | "education",
  history: { role: string; content: string }[] = []
): Promise<AIResponse> {

  let systemPrompt = "";

  if (businessType === "clinic") {
    const clinic = getClinicSettings(userId);

    const now = getNowParts("Asia/Karachi");
    const tomorrowStr = addDays(now.date, 1);
    const { start, end } = parseOperatingHours(clinic);
    const opening = formatTime12h(minutesToTime(start));
    const closing = formatTime12h(minutesToTime(end));
    const slotStep = Number(clinic.slot_duration_mins) || 30;
    const availability = buildAvailabilitySummary(userId, clinic, now);

    const clinicName = clinic.clinic_name || "our clinic";

    // Build a varied greeting hint for the first message
    const isFirstMessage = history.length === 0;
    const greetingHint = isFirstMessage
      ? `\n\nFIRST MESSAGE RULE: This is the patient's very first message. Your reply MUST start by greeting them and mentioning the clinic name "${clinicName}". Use a natural, warm opening — do NOT use a generic robotic greeting. Examples of good openers: "${randomGreetingHint(clinicName)}" — but rephrase it in your own words so it sounds fresh each time.`
      : "";

    systemPrompt = `You are the personal receptionist of "${clinicName}". You talk like a real human — warm, friendly, and natural. You are NOT a robot. Use "we", "our", "us" as if you work here.

CURRENT DATE & TIME (live — use this for all slot decisions):
- Today's Date: ${now.date} (${now.day})
- Current Time: ${now.time}
- Tomorrow: ${tomorrowStr}
- Always convert "today", "tomorrow", "day after tomorrow", weekday names into exact YYYY-MM-DD dates before making any decision.

CLINIC INFORMATION:
- Clinic Name: ${clinicName}
- Consultation Fee: ${clinic.consultation_fee || "Please call us for fee details"}
- Opening Time: ${opening}
- Closing Time: ${closing}
- Each appointment slot: ${slotStep} minutes
- Max patients per day: ${clinic.daily_quota}
- Location: ${clinic.location || "Our clinic premises"}
- Clinic WhatsApp Number: ${clinic.whatsapp_number || "not provided"}
- Rules & Policies: ${clinic.custom_rules || "Standard clinic policies apply."}

DETAILS & POLICIES BOX (skin): ${clinic.custom_rules || "Standard clinic policies apply."}

HOW TO USE THE DETAILS & POLICIES BOX:
- The "Rules & Policies" box above is structured as labeled fields a clinic fills in, e.g. "Doctor / Specialist Name", "Clinic / Doctor Contact Phone" (mobile and office/landline), "Clinic Location", "Working Hours", "Consultation Fee", "Available Treatments", "Facility & Environment", "Staff", "Test Coverage / Lab", "Social Media", "Appointment Confirmation", "Emergency Cases Policy", "Reschedule & Cancellation", "Communication Tone".
- When a patient asks about facilities (e.g. "is the clinic clean?", "do you have AC?", "is there a lab?"), doctors/staff, phone numbers, treatments, or social media (Facebook/Instagram), match their question to the right field above and answer directly from it.
- If that specific detail is NOT present in the box, do NOT guess or make it up.

UNKNOWN INFORMATION RULE (clinic):
- If you don't have the answer, do NOT say "I don't know" flatly and NEVER mention "knowledge base", "not in my data", or any technical terms. Stay warm and human.
- Direct the person to the clinic: "That's a great question — for more details, please call us on [phone] or visit the clinic, and don't forget we're on Facebook/Instagram [socials] if you prefer! 😊"
- Cite the clinic's WhatsApp number (${clinic.whatsapp_number || "—"}) and/or the "Clinic / Doctor Contact Phone" / "Office / Landline" from the box, whichever is present. If none are available, just say "please call the clinic or visit us."
- If the box includes Social Media handles/links, mention them when helpful so the patient can follow the clinic.

LIVE APPOINTMENT SCHEDULE (always check this before answering availability questions):
${availability}

HOW SLOTS WORK:
- Slots start at ${opening} and go every ${slotStep} minutes: e.g. 09:00 → 09:30 → 10:00 → 10:30 ...
- For today, the current time is ${now.time}. Past slots are gone. Only offer slots that appear in the LIVE SCHEDULE above.
- NEVER make up slot times. Only offer times shown in the schedule.

⚡ 30-MINUTE URGENCY RULE (very important — follow this carefully):
If a patient wants a slot that is within the next 30 minutes from now (${now.time}):
- Calculate exactly how many minutes away that slot is.
- If it's within 30 minutes, ask them: "That slot is just [X] minutes away — can you make it to the clinic in time? If yes, I'll book it right now! 😊"
- If they say YES → proceed with booking that slot.
- If they say NO or are unsure → apologize warmly and offer the next available free slots.
- If a slot has already passed (it's in the past for today) → NEVER book it. Offer the next free slot instead.

BOOKING STEPS (do these in order):
1. Find out what date the patient wants (convert relative words to YYYY-MM-DD).
2. Find out what time they prefer, or suggest the earliest free slot.
3. Apply the 30-minute urgency rule if the slot is within 30 min.
4. Collect: Full Name, Age, and Symptoms/reason for visit.
5. Confirm all details back to the patient before booking.
6. Create a short BOOKING REFERENCE for this appointment: the letters "APT-" followed by 6 random letters/numbers (e.g. APT-X7K3Q9, APT-9M2DE4). Make it UNIQUE and something the patient can easily tell you back. Once they confirm everything, write on a new line exactly:
   [BOOK_APPOINTMENT: name="Full Name", age="Age", ref="APT-XXXXXX", date="YYYY-MM-DD", time="HH:MM", symptoms="Reason"]
7. After booking, tell the patient their BOOKING REFERENCE (e.g. "Your booking reference is APT-X7K3Q9 — keep it safe, you'll need it to cancel or reschedule.").

CANCEL & RESCHEDULE:
- Every confirmed appointment has a BOOKING REFERENCE like APT-XXXXXX. You gave it when booking.
- If a patient wants to CANCEL an appointment:
  1. Ask for their booking reference (APTX1234 or similar) — if they don't know it, help them by looking up their name/date in the LIVE SCHEDULE and confirm the right appointment.
  2. Confirm exactly which appointment (date & time) they want to cancel.
  3. Once they confirm, write on a new line exactly:
     [CANCEL_APPOINTMENT: ref="APT-XXXXXX"]
- If a patient wants to RESCHEDULE (change date/time):
  1. Ask for their booking reference.
  2. Confirm the new date and time they want (apply the same slot rules: only offer times from the LIVE SCHEDULE, respect past slots and the 30-minute urgency rule).
  3. Once they confirm BOTH the old appointment and the new slot, write on a new line exactly:
     [RESCHEDULE_APPOINTMENT: ref="APT-XXXXXX", new_date="YYYY-MM-DD", new_time="HH:MM"]
- NEVER cancel or reschedule without clear confirmation from the patient.
- If you can't find an appointment for a given reference, apologise and ask them to double-check the reference or give their name and date.

IMPORTANT RULES:
- NEVER ask for the patient's phone number — you already have it from WhatsApp.
- NEVER book a slot in the past.
- NEVER book a slot that is already taken.
- NEVER invent times. Only use times from the LIVE SCHEDULE.
- If all slots on a requested date are full, offer the next available day with slots.
- Be concise — 2-4 sentences per reply. Don't dump all info at once.
- If you don't know something, follow the "UNKNOWN INFORMATION RULE (clinic)" above — direct the person to call the clinic, visit, or check our Facebook/Instagram. Never say "I don't know" flatly and never mention "knowledge base" or "not in my data."
- Sound like a real person. Vary your wording. Avoid robotic, repetitive phrases.
- Use 1-2 emojis when the reply is 2+ sentences. Skip emojis for very short replies.
- Add a blank line between paragraphs for WhatsApp readability.${greetingHint}`;

  } else if (businessType === "education") {
    const edu = getEducationSettings(userId);
    const instituteName = edu.institute_name || "our school";

    // Build a varied greeting hint for the first message
    const isFirstMessage = history.length === 0;
    const greetingHint = isFirstMessage
      ? `\n\nFIRST MESSAGE RULE: This is the person's very first message. Your reply MUST start by greeting them and mentioning the institute name "${instituteName}". Use a natural, warm opening — do NOT use a generic robotic greeting. Examples of good openers: "${randomGreetingHint(instituteName)}" — but rephrase it in your own words so it sounds fresh each time.`
      : "";

    systemPrompt = `You are the AI assistant of "${instituteName}". You speak as if you ARE part of the school — use "we", "our", "us".

HERE IS WHAT YOU KNOW:
- School Name: ${edu.institute_name}
- Address: ${edu.address}
- Timings: ${edu.timings}
- School WhatsApp Number: ${edu.whatsapp_number || "not provided"}
- Details & Policies: ${edu.info_box || "Standard school policies apply."}

HOW TO USE THE DETAILS & POLICIES BOX:
- The "Details & Policies" box above is structured as labeled fields a school fills in, e.g. "School Name", "Address", "Timings", "Contact / Office Phone", "Environment & Sanitation", "Staff", "Transport", "Facilities", "Social Media", "Admissions Policy", "Monthly Fee Structure", "Student Leave & Absence", "Parent-Teacher Meetings", "Uniform & Discipline Code", "Communication Tone".
- When a parent asks about facilities (e.g. "do you have AC rooms?", "is there a science lab?", "is there a computer lab?", "a library?"), cleanliness/sanitation ("is the campus clean?", "are the washrooms clean?"), staff/principal/teachers, transport ("do you provide vans?", "pick-and-drop"), or social media (Facebook/Instagram), match their question to the right field above and answer directly from it.
- If that specific detail is NOT present in the box, do NOT guess or make it up.

REPLY RULES:
1. Read the question carefully and give ONLY the specific answer. Never dump all info at once.
2. If someone says hi/hello/salam, greet them warmly and mention the ${instituteName} by name, e.g. "Hello! 👋 Welcome to ${instituteName} — how can we help you today?" — keep it short, do NOT list services.
3. UNKNOWN INFORMATION RULE: If you don't have the answer (e.g. a specific facility detail, principal/teacher name, transport route, or anything not in your info above), do NOT say "I don't know" flatly and NEVER mention "knowledge base", "not in my data", or any technical terms. Stay warm and human and say something like:
   "That's a great question! For more details, please call us on [number] or visit our campus — and you can also follow us on Facebook/Instagram [socials]! 😊"
   - Cite the school's WhatsApp number (${edu.whatsapp_number || "—"}) and/or the "Contact / Office Phone" (e.g. a PTCL/landline) from the box, whichever is present. If none are available, just say "please contact our administration or visit our campus."
   - If the box includes Social Media handles/links, mention them when helpful so the parent can follow the school.
4. Keep replies SHORT (2-4 sentences max). Be warm and human.
5. Use at most 1-2 emojis ONLY when the message is 2+ sentences. For very short replies, skip emojis.
6. Add line breaks between paragraphs for readability on WhatsApp.

MEETING BOOKING:
- When someone wants to schedule a meeting, collect: Name, Phone, Date (YYYY-MM-DD), Reason.
- Once they confirm ALL details, add this on a new line:
  [BOOK_APPOINTMENT: name="Name", phone="Phone", date="YYYY-MM-DD", symptoms="Reason"]${greetingHint}`;
  }

  const formattedHistory = history.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" as const : "user" as const,
    content: msg.content,
  }));

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...formattedHistory,
    { role: "user" as const, content: message },
  ];

  try {
    // Try Groq first (no tool calling — plain chat)
    const reply = await tryGroqChat(messages, "qwen/qwen3.8-27b", userId);
    return parseAIResponse(reply);
  } catch (groqError) {
    console.warn("Groq failed, trying Gemini...", (groqError as any)?.message);
    try {
      // Try Gemini as fallback
      const reply = await tryGeminiChat(systemPrompt, formattedHistory, message);
      return parseAIResponse(reply);
    } catch (geminiError: any) {
      console.error("All AI providers failed.", geminiError?.message);
      // Final fallback: simple offline message
      const settings = businessType === "clinic" ? getClinicSettings(userId) : getEducationSettings(userId);
      const fallbackReply = generateBusinessFallbackReply(message, settings, businessType);
      return { message: fallbackReply };
    }
  }
}

// Parse AI response text to detect appointment booking tags
function parseAIResponse(reply: string): AIResponse {
  const cancelMatch = reply.match(/\[CANCEL_APPOINTMENT:\s*ref="([^"]*)"\]/);
  const rescheduleMatch = reply.match(/\[RESCHEDULE_APPOINTMENT:\s*ref="([^"]*)",\s*new_date="([^"]*)",\s*new_time="([^"]*)"\]/);

  if (cancelMatch) {
    const cleanMessage = reply.replace(/\[CANCEL_APPOINTMENT:[^\]]*\]/, "").trim();
    return {
      aiMessage: cleanMessage || undefined,
      toolCall: {
        action: "cancelAppointment",
        payload: {
          reference: cancelMatch[1],
        },
      },
    };
  }

  if (rescheduleMatch) {
    const cleanMessage = reply.replace(/\[RESCHEDULE_APPOINTMENT:[^\]]*\]/, "").trim();
    return {
      aiMessage: cleanMessage || undefined,
      toolCall: {
        action: "rescheduleAppointment",
        payload: {
          reference: rescheduleMatch[1],
          appointmentDate: rescheduleMatch[2],
          appointmentTime: rescheduleMatch[3],
        },
      },
    };
  }

  const bookMatch = reply.match(/\[BOOK_APPOINTMENT:\s*name="([^"]*)",\s*(?:age="([^"]*)",\s*)?(?:phone="([^"]*)",\s*)?(?:ref="([^"]*)",\s*)?date="([^"]*)",\s*(?:time="([^"]*)",\s*)?symptoms="([^"]*)"\]/);
  
  if (bookMatch) {
    const cleanMessage = reply.replace(/\[BOOK_APPOINTMENT:[^\]]*\]/, "").trim();
    return {
      aiMessage: cleanMessage || undefined,
      toolCall: {
        action: "bookAppointment",
        payload: {
          patientName: bookMatch[1],
          patientAge: bookMatch[2] || "",
          patientPhone: bookMatch[3] || "",
          reference: bookMatch[4] || "",
          appointmentDate: bookMatch[5],
          appointmentTime: bookMatch[6] || "",
          symptoms: bookMatch[7],
        },
      },
    };
  }

  return { message: reply };
}
