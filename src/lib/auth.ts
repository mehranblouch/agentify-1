import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  createSession,
  destroySession,
  getSession,
  updatePasswordHash,
} from "./services/sqlite-store";

export const SESSION_COOKIE = "agentify_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

// ─────────────────────────────────────────────
// Password hashing (scrypt, no external deps)
// ─────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (!stored.startsWith("scrypt$")) {
    // Legacy plaintext — keep supporting old rows until they log in.
    return stored === password;
  }
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  const actual = Buffer.from(derived);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Lazy-migrate legacy plaintext rows: if plaintext matches, write the scrypt hash.
export async function ensurePasswordUpgraded(
  email: string,
  password: string,
  stored: string | null | undefined
): Promise<void> {
  if (stored && !stored.startsWith("scrypt$") && stored === password) {
    updatePasswordHash(email, hashPassword(password));
  }
}

// ─────────────────────────────────────────────
// Server-side sessions (httpOnly cookie)
// ─────────────────────────────────────────────

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function issueSession(
  userId: string | null,
  role: "user" | "admin"
): string {
  const token = newSessionToken();
  const hash = sha256(token);
  createSession(hash, userId, role, SESSION_TTL_MS);
  return token;
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export interface SessionInfo {
  userId: string | null;
  role: string;
}

/** Resolve the session (if any) purely from the request cookie. */
export function resolveRequestSession(req: Request): SessionInfo | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!match) return null;
  const session = getSession(sha256(match));
  if (!session) return null;
  return { userId: session.user_id, role: session.role };
}

/** Require a valid session; returns a 401 JSON response if missing. */
export function requireSession(
  req: Request
): { session: SessionInfo } | { error: NextResponse } {
  const session = resolveRequestSession(req);
  if (!session) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

/** Require a valid ADMIN session. */
export function requireAdminSession(
  req: Request
): { session: SessionInfo } | { error: NextResponse } {
  const session = resolveRequestSession(req);
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function destroyCurrentSession(req: Request): void {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (token) destroySession(sha256(token));
}

// ─────────────────────────────────────────────
// Admin password (server-side only)
// ─────────────────────────────────────────────

export function verifyAdminPassword(input: string): boolean {
  const hashSource = process.env.ADMIN_PASSWORD_HASH;
  if (hashSource) return verifyPassword(input, hashSource);

  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return timingSafeEqualStr(input, fromEnv);

  // Fallback default (server-side only — never shipped to the client bundle).
  const defaultPw = process.env.ADMIN_DEFAULT_PASSWORD || "mmkrb4747";
  return timingSafeEqualStr(input, defaultPw);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    ""
  );
}