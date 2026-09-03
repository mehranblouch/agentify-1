import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  Browsers,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import fs from "fs";
import { processReceptionistAI, resolveAppointmentSlot, formatTime12h, findNextDayWithSlot } from "./services/ai-receptionist";
import {
  getUserByWhatsAppNumber,
  saveAppointment,
  getAppointmentByPhoneAndDate,
  getClinicSettings,
  logMessage,
  isBusinessPaused,
  cancelAppointmentById,
  getAppointmentByReference,
  generateBookingRef,
} from "./services/sqlite-store";

// ─────────────────────────────────────────────────────────
// IN-MEMORY STORES
// ─────────────────────────────────────────────────────────
const sessions: { [key: string]: any } = {};
const conversationHistory: { [jid: string]: { role: string; content: string }[] } = {};
const recentBotReplies = new Set<string>();

// ─────────────────────────────────────────────────────────
// GLOBAL MAPS (survive HMR but reset on process restart)
// ─────────────────────────────────────────────────────────
if (!(global as any).whatsappSessions) (global as any).whatsappSessions = new Map();
if (!(global as any).whatsappPairing) (global as any).whatsappPairing = new Set<string>();
if (!(global as any).whatsappBootstrapped) (global as any).whatsappBootstrapped = false;

// ─────────────────────────────────────────────────────────
// WA WEB VERSION CACHE
// ─────────────────────────────────────────────────────────
let cachedVersion: { version: number[]; isLatest: boolean } | null = null;

async function getBaileysVersion() {
  if (cachedVersion) return cachedVersion;

  try {
    const waRes = await fetchLatestWaWebVersion();
    if (waRes?.version) {
      cachedVersion = waRes;
      console.log("[WA Version] Live WA Web version:", waRes.version);
      return cachedVersion;
    }
  } catch {}

  try {
    const bRes = await fetchLatestBaileysVersion();
    if (bRes?.version) {
      cachedVersion = bRes;
      console.log("[WA Version] Baileys version:", bRes.version);
      return cachedVersion;
    }
  } catch {}

  cachedVersion = { version: [2, 3000, 1043857760], isLatest: false };
  return cachedVersion;
}

// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// SESSIONS DIRECTORY (Configurable for Railway persistent volumes)
// ─────────────────────────────────────────────────────────
export const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(process.cwd(), "sessions");

// ─────────────────────────────────────────────────────────
// PHONE NUMBER NORMALIZATION
// ─────────────────────────────────────────────────────────
export function normalizePhoneNumber(phoneNumber: string): string {
  let clean = phoneNumber.replace(/\D/g, "");
  if (clean.startsWith("03") && clean.length === 11) {
    clean = "92" + clean.slice(1);
  } else if (clean.startsWith("00")) {
    clean = clean.slice(2);
  }
  return clean;
}

export function getCanonicalSessionNumber(phoneNumber: string): string {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) return "";

  // Direct match
  const directDir = path.join(SESSIONS_DIR, cleanNumber);
  if (fs.existsSync(path.join(directDir, "creds.json"))) {
    return cleanNumber;
  }

  // Fuzzy match by last 9 digits
  const last9 = cleanNumber.slice(-9);
  if (last9.length >= 7) {
    if (fs.existsSync(SESSIONS_DIR)) {
      try {
        for (const entry of fs.readdirSync(SESSIONS_DIR)) {
          if (entry.endsWith(last9) && fs.existsSync(path.join(SESSIONS_DIR, entry, "creds.json"))) {
            return entry;
          }
        }
      } catch {}
    }
  }

  return cleanNumber;
}

// ─────────────────────────────────────────────────────────
// SESSION REGISTRATION CHECK
// FIX: Accept sessions where WhatsApp confirmed the phone (me.id exists)
// even if Baileys didn't write registered:true yet.
// ─────────────────────────────────────────────────────────
export function isSessionRegistered(phoneNumber: string): boolean {
  const cleanNumber = getCanonicalSessionNumber(phoneNumber);
  const credsPath = path.join(SESSIONS_DIR, cleanNumber, "creds.json");
  if (!fs.existsSync(credsPath)) return false;
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
    // Accept if explicitly registered OR if WhatsApp confirmed the phone (me.id exists)
    if (creds.registered === true) return true;
    if (creds.me?.id && creds.me.id.includes("@s.whatsapp.net")) return true;
    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// SOCKET CONNECTION CHECK
// ─────────────────────────────────────────────────────────
export function isSocketConnected(sock: any): boolean {
  if (!sock) return false;
  const hasUser = !!(sock.user?.id);
  const isOpen = sock.ws?.isOpen === true || (sock as any).connectionState?.status === "open";
  const isRegistered = sock.authState?.creds?.registered === true;
  const hasMeId = !!(sock.authState?.creds?.me?.id);
  return (hasUser && isOpen) || (isRegistered && isOpen) || (hasMeId && isOpen);
}

// ─────────────────────────────────────────────────────────
// SESSION STORE HELPERS
// ─────────────────────────────────────────────────────────
function storeSession(cleanNumber: string, sock: any) {
  sessions[cleanNumber] = sock;
  (global as any).whatsappSessions.set(cleanNumber, sock);
}

function deleteSession(cleanNumber: string) {
  delete sessions[cleanNumber];
  (global as any).whatsappSessions?.delete(cleanNumber);
}

// ─────────────────────────────────────────────────────────
// BUSINESS LOOKUP — purely from SQLite, no in-memory dependency
// ─────────────────────────────────────────────────────────
function getBusinessForSocket(cleanNumber: string) {
  // Always resolve from database — no memory dependency
  return getUserByWhatsAppNumber(cleanNumber);
}

// ─────────────────────────────────────────────────────────
// PAIRING CODE STRING NORMALIZER
// ─────────────────────────────────────────────────────────
function pairingCodeToString(code: any): string {
  if (!code && code !== 0) return "";
  if (typeof code === "string") return code.trim();
  if (typeof code === "object") {
    if (typeof code.pairingCode === "string") return code.pairingCode.trim();
    if (typeof code.code === "string") return code.code.trim();
    if (Array.isArray(code)) return code.join("").trim();
  }
  try { return String(code).trim(); } catch { return ""; }
}

// ─────────────────────────────────────────────────────────
// HUMANIZED DELAY HELPERS
// Goal: make send timing look like a real person so Meta's
// anti-bot heuristics don't flag the account.
// ─────────────────────────────────────────────────────────

/**
 * Box-Muller Gaussian sample, clamped to [min, max] ms.
 * mean and stddev are in milliseconds.
 */
function gaussianMs(mean: number, stddev: number, min: number, max: number): number {
  // Box-Muller transform
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random() || 1e-10;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const sample = mean + z * stddev;
  return Math.round(Math.max(min, Math.min(max, sample)));
}

/**
 * First message in a conversation: fast reply (≤2 s) so the user
 * knows someone is there. Small jitter so it never feels instant-bot.
 * Range: 800 ms – 2000 ms, centred around ~1.4 s.
 */
function humanFirstDelay(): number {
  return gaussianMs(1400, 300, 800, 2000);
}

/**
 * Subsequent messages: Gaussian jitter 2–9 s.
 * Longer replies get a slightly higher mean (simulates reading + typing).
 * charCount is the length of the reply being sent.
 */
function humanTypingDelay(reply: string): number {
  const chars = reply.length;
  // ~40 wpm typing speed → ~200 ms/word → scale by word count
  const words = Math.max(1, chars / 5);
  // mean grows with word count but stays within 2–8 s window
  const mean = Math.min(8000, Math.max(2000, words * 180));
  const stddev = mean * 0.25; // 25% variance
  return gaussianMs(mean, stddev, 2000, 9000);
}

/**
 * Waits for `delayMs`, keeping the "composing" presence alive every
 * 4 s so WhatsApp doesn't drop it — then stops composing.
 */
async function humanSendDelay(sock: any, jid: string, delayMs: number): Promise<void> {
  const REFRESH_EVERY = 4000; // resend composing tick every 4 s
  let elapsed = 0;
  while (elapsed < delayMs) {
    const chunk = Math.min(REFRESH_EVERY, delayMs - elapsed);
    await new Promise(r => setTimeout(r, chunk));
    elapsed += chunk;
    if (elapsed < delayMs) {
      // Keep the composing indicator alive mid-wait
      try { await sock.sendPresenceUpdate("composing", jid); } catch {}
    }
  }
  try { await sock.sendPresenceUpdate("paused", jid); } catch {}
}

// ─────────────────────────────────────────────────────────
// HELPER: Extract text from any WhatsApp message structure
// ─────────────────────────────────────────────────────────
function extractMessageText(message: any): string {
  if (!message) return "";
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  if (message.buttonsResponseMessage?.selectedDisplayText || message.buttonsResponseMessage?.selectedButtonId) {
    return message.buttonsResponseMessage.selectedDisplayText || message.buttonsResponseMessage.selectedButtonId || "";
  }
  if (message.templateButtonReplyMessage?.selectedId) return message.templateButtonReplyMessage.selectedId;
  if (message.listResponseMessage?.title || message.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return message.listResponseMessage.title || message.listResponseMessage.singleSelectReply?.selectedRowId || "";
  }
  if (message.ephemeralMessage?.message) return extractMessageText(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return extractMessageText(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return extractMessageText(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage?.message) return extractMessageText(message.documentWithCaptionMessage.message);
  return "";
}

// ─────────────────────────────────────────────────────────
// MESSAGE HANDLER — attached when socket opens
// ─────────────────────────────────────────────────────────
function registerMessageHandler(sock: any, cleanNumber: string) {
  sock.ev.removeAllListeners("messages.upsert");

  sock.ev.on("messages.upsert", async (m: any) => {
    if (m.type !== "notify") return;
    if (!m.messages || !Array.isArray(m.messages)) return;

    for (const msg of m.messages) {
      if (!msg.message) continue;

      const rawJid = msg.key.remoteJid;
      if (!rawJid || rawJid.endsWith("@broadcast") || rawJid.includes("@newsletter") || rawJid.includes("@g.us")) {
        continue;
      }

      const targetJid = jidNormalizedUser ? jidNormalizedUser(rawJid) : rawJid.replace(/:\d+@/, "@");
      const text = extractMessageText(msg.message).trim();
      if (!text) continue;

      // Skip own replies
      if (msg.key.fromMe) continue;
      if (recentBotReplies.has(text)) continue;

      console.log(`[WA ${cleanNumber}] 📥 From ${targetJid}: "${text}"`);

      try {
        // Always look up business from SQLite — works after restart
        const user = getBusinessForSocket(cleanNumber);
        const rawPhone = targetJid.split("@")[0];

        // If the business is paused, ignore incoming messages entirely
        if (isBusinessPaused(user.userId)) {
          console.log(`[WA ${cleanNumber}] ⏸ Business ${user.userId} is paused — message ignored`);
          continue;
        }

        logMessage(user.userId, "incoming", rawPhone, text);

        if (!conversationHistory[targetJid]) conversationHistory[targetJid] = [];
        conversationHistory[targetJid].push({ role: "user", content: text });
        if (conversationHistory[targetJid].length > 20) conversationHistory[targetJid].shift();

        // Detect first message BEFORE AI runs (history had 0 turns before this push)
        const isFirstMessage = conversationHistory[targetJid].length === 1;

        await sock.sendPresenceUpdate("composing", targetJid);

        let aiResult;
        try {
          aiResult = await processReceptionistAI(
            text,
            user.userId,
            user.businessType,
            conversationHistory[targetJid].slice(0, -1)
          );
        } catch (aiErr: any) {
          console.warn("[WA] AI error:", aiErr?.message);
          aiResult = { message: null };
        }

        let replyText = aiResult?.message || "";

        // Handle appointment booking tool call
        if (aiResult?.toolCall?.action === "bookAppointment") {
          const payload = aiResult.toolCall.payload;
          const date = payload.appointmentDate;
          const existing = getAppointmentByPhoneAndDate(user.userId, rawPhone, date);
          if (existing) {
            replyText = `Looks like you already have an appointment with us on ${date}! 😊 Would you like to reschedule or pick a different date?`;
          } else if (user.businessType === "clinic") {
            const clinic = getClinicSettings(user.userId);
            const clinicName = clinic.clinic_name || "our clinic";
            const slot = resolveAppointmentSlot(clinic, user.userId, date, payload.appointmentTime);
            if (!slot) {
              const next = findNextDayWithSlot(user.userId, clinic, date);
              replyText = next
                ? `Oh sorry, ${date} is completely full! 😔 But don't worry — the next available slot at ${clinicName} is ${next.date} at ${formatTime12h(next.slot)}. Want me to grab that for you?`
                : `I'm so sorry, ${date} is fully booked and we don't have any open slots in the coming days either. Please give us a call and we'll sort something out for you! 🙏`;
            } else {
              const ref = payload.reference || generateBookingRef();
              saveAppointment({
                user_id: user.userId,
                patient_name: payload.patientName || "Patient",
                patient_phone: rawPhone,
                appointment_date: date,
                appointment_time: slot,
                age: payload.patientAge || "",
                symptoms: payload.symptoms || "",
                status: "confirmed",
                source: "whatsapp",
                whatsapp_jid: targetJid,
                booking_ref: ref,
              });
              const aiTime = payload.appointmentTime;
              const consistent = aiTime && !!formatTime12h(aiTime) && formatTime12h(aiTime) === formatTime12h(slot);
              const refNote = ref && ref.startsWith("APT-") ? ` Your booking reference is *${ref}* — keep it safe, you'll need it to cancel or reschedule.` : "";
              replyText = consistent && aiResult.aiMessage
                ? aiResult.aiMessage + refNote
                : `✅ Done! Your appointment at ${clinicName} is confirmed for *${date}* at *${formatTime12h(slot)}*.${refNote} Please arrive a few minutes early. See you soon! 😊`;
            }
          } else {
            const ref = payload.reference || generateBookingRef();
            saveAppointment({
              user_id: user.userId,
              patient_name: payload.patientName || "Patient",
              patient_phone: rawPhone,
              appointment_date: date,
              appointment_time: payload.appointmentTime || "TBD",
              age: payload.patientAge || "",
              symptoms: payload.symptoms || "",
              status: "confirmed",
              source: "whatsapp",
              whatsapp_jid: targetJid,
              booking_ref: ref,
            });
            const refNote = ref && ref.startsWith("APT-") ? ` Your booking reference is *${ref}* — keep it safe, you'll need it to cancel or reschedule.` : "";
            replyText = (aiResult.aiMessage || `✅ Appointment confirmed for ${date}! We look forward to seeing you.`) + refNote;
          }
        } else if (aiResult?.toolCall?.action === "cancelAppointment") {
          const payload = aiResult.toolCall.payload;
          const cancelled = cancelAppointmentById(user.userId, payload.reference);
          if (cancelled) {
            replyText = `Done! Your appointment at *${cancelled.appointment_date}* at *${formatTime12h(cancelled.appointment_time)}* has been cancelled. ${aiResult.aiMessage ? aiResult.aiMessage + " " : ""}If you'd like to book a new one, just let me know! 😊`;
          } else {
            replyText = aiResult.aiMessage || `I couldn't find an active appointment for reference *${payload.reference}*. Could you double-check your booking reference, or tell me your name and date? 😊`;
          }
        } else if (aiResult?.toolCall?.action === "rescheduleAppointment") {
          const payload = aiResult.toolCall.payload;
          const cancelled = cancelAppointmentById(user.userId, payload.reference);
          if (!cancelled) {
            replyText = aiResult.aiMessage || `I couldn't find an active appointment for reference *${payload.reference}*. Could you double-check your booking reference? 😊`;
          } else if (user.businessType === "clinic") {
            const clinic = getClinicSettings(user.userId);
            const clinicName = clinic.clinic_name || "our clinic";
            const newDate = payload.appointmentDate;
            const slot = resolveAppointmentSlot(clinic, user.userId, newDate, payload.appointmentTime);
            if (!slot) {
              const next = findNextDayWithSlot(user.userId, clinic, newDate);
              replyText = next
                ? `I've cancelled your old appointment, but ${newDate} is full. 😔 The next available slot at ${clinicName} is ${next.date} at ${formatTime12h(next.slot)}. Want me to book that new time for you?`
                : `I've cancelled your old appointment, but I'm sorry — we have no open slots in the coming days for the new time. Please give us a call to arrange something! 🙏`;
            } else {
              const ref = generateBookingRef();

              saveAppointment({
                user_id: user.userId,
                patient_name: cancelled.patient_name,
                patient_phone: rawPhone,
                appointment_date: newDate,
                appointment_time: slot,
                age: cancelled.age || "",
                symptoms: cancelled.symptoms || "",
                status: "confirmed",
                source: "whatsapp",
                whatsapp_jid: targetJid,
                booking_ref: ref,
              });
              const aiTime = payload.appointmentTime;
              const consistent = aiTime && !!formatTime12h(aiTime) && formatTime12h(aiTime) === formatTime12h(slot);
              const refNote = ref.startsWith("APT-") ? ` Your new booking reference is *${ref}*.` : "";
              replyText = consistent && aiResult.aiMessage
                ? aiResult.aiMessage + refNote
                : `All done! Your appointment has been moved to *${newDate}* at *${formatTime12h(slot)}* at ${clinicName}.${refNote} Old appointment cancelled. See you then! 😊`;
            }
          } else {
            const ref = generateBookingRef();
            saveAppointment({
              user_id: user.userId,
              patient_name: cancelled.patient_name,
              patient_phone: rawPhone,
              appointment_date: payload.appointmentDate,
              appointment_time: payload.appointmentTime || "TBD",
              age: cancelled.age || "",
              symptoms: cancelled.symptoms || "",
              status: "confirmed",
              source: "whatsapp",
              whatsapp_jid: targetJid,
              booking_ref: ref,
            });
            const refNote = ref.startsWith("APT-") ? ` Your new booking reference is *${ref}*.` : "";
            replyText = (aiResult.aiMessage || `✅ Your appointment has been rescheduled to ${payload.appointmentDate}!`) + refNote;
          }
        }

        if (!replyText) {
          replyText = "Thank you for contacting us! How can I help you today?";
        }

        // ── Humanized send delay ────────────────────────────────────────
        // First message  → fast reply ≤2 s (user knows we're here)
        // Subsequent msgs → Gaussian 2–9 s scaled to reply length
        //                   (simulates reading + typing like a real person)
        // "composing" presence is refreshed every 4 s throughout the wait
        // so Meta sees normal human behaviour and doesn't flag the account.
        const typingDelayMs = isFirstMessage
          ? humanFirstDelay()
          : humanTypingDelay(replyText);

        console.log(`[WA ${cleanNumber}] ⏳ Typing delay: ${typingDelayMs} ms (firstMsg=${isFirstMessage})`);
        await humanSendDelay(sock, targetJid, typingDelayMs);
        // ───────────────────────────────────────────────────────────────

        recentBotReplies.add(replyText.trim());
        if (recentBotReplies.size > 50) {
          const first = recentBotReplies.values().next().value;
          if (first) recentBotReplies.delete(first);
        }

        await sock.sendMessage(targetJid, { text: replyText });
        console.log(`[WA ${cleanNumber}] 📤 Replied to ${targetJid}: "${replyText.slice(0, 60)}..."`);

        logMessage(user.userId, "outgoing", rawPhone, replyText);
        conversationHistory[targetJid].push({ role: "assistant", content: replyText });
        if (conversationHistory[targetJid].length > 20) conversationHistory[targetJid].shift();

      } catch (err: any) {
        console.error(`[WA ${cleanNumber}] ❌ Handler error:`, err?.message || err);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────
// SHARED EVENT HANDLERS (connection.update + creds.update)
// ─────────────────────────────────────────────────────────
function setupEventHandlers(
  sock: any,
  cleanNumber: string,
  source: string,
  saveCreds: () => Promise<void>
) {
  // Save creds immediately on every update
  sock.ev.on("creds.update", async () => {
    await saveCreds();
  });

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect } = update;
    console.log(`[${source}] connection.update: connection=${connection ?? "none"} isNewLogin=${!!update.isNewLogin}`);

    if (update.isNewLogin) {
      console.log(`[${source}] ✅ New login — saving creds for ${cleanNumber}`);
      await saveCreds();
      (global as any).whatsappPairing?.delete(cleanNumber);
    }

    if (connection === "open") {
      console.log(`[${source}] ✅ Socket OPEN for ${cleanNumber}`);
      await saveCreds();
      storeSession(cleanNumber, sock);
      (global as any).whatsappPairing?.delete(cleanNumber);
      registerMessageHandler(sock, cleanNumber);
    } else if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isRestartRequired = statusCode === DisconnectReason.restartRequired;

      console.log(`[${source}] ❌ Connection closed for ${cleanNumber}. code=${statusCode} loggedOut=${isLoggedOut} restartRequired=${isRestartRequired}`);

      deleteSession(cleanNumber);

      if (isRestartRequired) {
        console.log(`[${source}] Reconnecting ${cleanNumber} after restart-required...`);
        (global as any).whatsappPairing?.delete(cleanNumber);
        setTimeout(() => getWhatsAppSession(cleanNumber).catch(console.error), 2000);
        return;
      }

      if (isLoggedOut) {
        console.log(`[${source}] ${cleanNumber} was logged out. Removing session and re-pairing.`);
        (global as any).whatsappPairing?.delete(cleanNumber);
        // Remove stale credentials so the account no longer shows as connected
        const authDir = path.join(SESSIONS_DIR, cleanNumber);
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
        return;
      }

      // Network error — auto-reconnect if not in pairing
      const isPairing = (global as any).whatsappPairing?.has(cleanNumber);
      if (!isPairing) {
        console.log(`[${source}] Reconnecting ${cleanNumber} in 3s...`);
        setTimeout(() => getWhatsAppSession(cleanNumber).catch(console.error), 3000);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────
// FLOW 1: QR-CODE pairing
// ─────────────────────────────────────────────────────────
export async function createQRSocket(phoneNumber: string): Promise<{ sock: any; qrString: string }> {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  const authDir = path.join(SESSIONS_DIR, cleanNumber);

  // Close existing socket
  const existingSock = sessions[cleanNumber] || (global as any).whatsappSessions?.get(cleanNumber);
  if (existingSock) { try { existingSock.end?.(undefined); } catch {} }
  deleteSession(cleanNumber);

  // Always fresh for pairing
  if (fs.existsSync(authDir)) { try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {} }
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await getBaileysVersion();

  console.log(`[QR] Creating socket for ${cleanNumber}...`);

  let resolveQR!: (qr: string) => void;
  let rejectQR!: (err: Error) => void;
  const qrPromise = new Promise<string>((res, rej) => { resolveQR = res; rejectQR = rej; });
  const qrTimeout = setTimeout(() => rejectQR(new Error("QR not generated within 25s")), 25_000);

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    mobile: false,
    auth: state,
    logger: pino({ level: "warn" }),
    browser: Browsers.ubuntu("Chrome"),
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    syncFullHistory: false,
    getMessage: async () => undefined,
  });

  (global as any).whatsappPairing?.add(cleanNumber);
  storeSession(cleanNumber, sock);

  sock.ev.on("qr", (qr: string) => {
    console.log(`[QR] QR received for ${cleanNumber}`);
    clearTimeout(qrTimeout);
    resolveQR(qr);
  });

  setupEventHandlers(sock, cleanNumber, "QR", saveCreds);

  const qrString = await qrPromise;
  return { sock, qrString };
}

// ─────────────────────────────────────────────────────────
// FLOW 2: NUMERIC PAIRING CODE
// ─────────────────────────────────────────────────────────
export async function createPairingSocket(phoneNumber: string): Promise<{ sock: any; pairingCode: string }> {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  const authDir = path.join(SESSIONS_DIR, cleanNumber);

  // Close existing socket
  const existingSock = sessions[cleanNumber] || (global as any).whatsappSessions?.get(cleanNumber);
  if (existingSock) { try { existingSock.end?.(undefined); } catch {} }
  deleteSession(cleanNumber);

  // Always fresh for new pairing code
  if (fs.existsSync(authDir)) { try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {} }
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await getBaileysVersion();

  console.log(`[Pair] Creating socket for ${cleanNumber}...`);

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    mobile: false,
    auth: state,
    logger: pino({ level: "warn" }),
    browser: Browsers.ubuntu("Chrome"),
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    syncFullHistory: false,
    getMessage: async () => undefined,
  });

  (global as any).whatsappPairing?.add(cleanNumber);
  storeSession(cleanNumber, sock);
  setupEventHandlers(sock, cleanNumber, "Pair", saveCreds);

  const pairingCode = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let codeRequested = false;

    const done = (code?: string, err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(fallback);
      if (err) reject(err);
      else resolve(code!);
    };

    const timeout = setTimeout(() => done(undefined, new Error("Pairing code not received within 30s")), 30_000);

    const requestCode = async () => {
      if (codeRequested || settled) return;
      codeRequested = true;
      await new Promise(r => setTimeout(r, 300));

      if (typeof (sock as any).requestPairingCode !== "function") {
        return done(undefined, new Error("requestPairingCode not available"));
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const raw = await (sock as any).requestPairingCode(cleanNumber);
          const parsed = pairingCodeToString(raw);
          console.log(`[Pair] Code received (attempt ${attempt}):`, parsed);
          return done(parsed || raw);
        } catch (err: any) {
          console.warn(`[Pair] Attempt ${attempt} failed:`, err?.message);
          await new Promise(r => setTimeout(r, 700 * attempt));
        }
      }
      done(undefined, new Error("Failed to get pairing code after 3 attempts"));
    };

    sock.ev.on("qr", () => requestCode());
    sock.ev.on("connection.update", (update: any) => {
      if (update.qr) requestCode();
      if (update.connection === "close" && !codeRequested) {
        const statusCode = (update.lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode !== DisconnectReason.restartRequired) {
          done(undefined, new Error(`Connection closed before pairing code (code: ${statusCode})`));
        }
      }
    });

    const fallback = setTimeout(() => { if (!codeRequested && !settled) requestCode(); }, 2500);
  });

  const formatted = pairingCode.length === 8
    ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
    : pairingCode;

  console.log(`[Pair] Code ready for ${cleanNumber}: ${formatted}`);
  return { sock, pairingCode: formatted };
}

// ─────────────────────────────────────────────────────────
// SESSION RESTORE: Get or create a session socket
// ─────────────────────────────────────────────────────────
export async function getWhatsAppSession(phoneNumber: string): Promise<any> {
  const cleanNumber = getCanonicalSessionNumber(phoneNumber);
  const authDir = path.join(SESSIONS_DIR, cleanNumber);

  // Return existing connected socket
  const existing = sessions[cleanNumber] || (global as any).whatsappSessions?.get(cleanNumber);
  if (existing && isSocketConnected(existing)) {
    return existing;
  }

  // Must have credentials on disk
  if (!isSessionRegistered(cleanNumber)) {
    console.log(`[WA] No valid session for ${cleanNumber} — needs pairing`);
    return null;
  }

  // Don't create new socket during active pairing
  if ((global as any).whatsappPairing?.has(cleanNumber)) {
    return existing || null;
  }

  console.log(`[WA] Restoring session for ${cleanNumber}...`);

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await getBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    mobile: false,
    auth: state,
    logger: pino({ level: "warn" }),
    browser: Browsers.ubuntu("Chrome"),
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    syncFullHistory: false,
    getMessage: async () => undefined,
  });

  storeSession(cleanNumber, sock);
  setupEventHandlers(sock, cleanNumber, "Restore", saveCreds);
  // Message handler will also be attached inside setupEventHandlers when connection opens

  return sock;
}

// ─────────────────────────────────────────────────────────
// BOOTSTRAP: Auto-restore all sessions from disk on startup
// ─────────────────────────────────────────────────────────
export async function bootstrapAllSessions() {
  if ((global as any).whatsappBootstrapped) return;
  (global as any).whatsappBootstrapped = true;

  if (!fs.existsSync(SESSIONS_DIR)) return;

  let entries: string[] = [];
  try { entries = fs.readdirSync(SESSIONS_DIR); } catch { return; }

  for (const entry of entries) {
    const credsPath = path.join(SESSIONS_DIR, entry, "creds.json");
    if (!fs.existsSync(credsPath)) continue;

    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
      const isValid = creds.registered === true || (creds.me?.id && creds.me.id.includes("@s.whatsapp.net"));
      if (!isValid) {
        console.log(`[Bootstrap] Skipping ${entry} — not registered`);
        continue;
      }

      const already = sessions[entry] || (global as any).whatsappSessions?.get(entry);
      if (already && isSocketConnected(already)) continue;

      console.log(`[Bootstrap] Restoring session for ${entry}...`);
      getWhatsAppSession(entry).catch(e => console.warn(`[Bootstrap] Failed to restore ${entry}:`, e?.message));
    } catch (e) {
      console.warn(`[Bootstrap] Error reading creds for ${entry}:`, e);
    }
  }
}

// ─────────────────────────────────────────────────────────
// EXPORTS for backward compat
// ─────────────────────────────────────────────────────────
export function isSocketRegistered(phoneNumber: string): boolean {
  return isSessionRegistered(phoneNumber);
}

export function registerBusiness(cleanNumber: string, userId: string, businessType: "clinic" | "education") {
  // No-op: business registry now done purely via SQLite lookup
  console.log(`[WA] Business registered: ${cleanNumber} → ${userId} (${businessType})`);
}

export function getBusinessForNumber(cleanNumber: string) {
  return getUserByWhatsAppNumber(cleanNumber);
}
