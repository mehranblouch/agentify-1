import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/services/sqlite-store";
import {
  issueSession,
  setSessionCookie,
  verifyPassword,
  ensurePasswordUpgraded,
  getClientIp,
  MAX_LOGIN_ATTEMPTS,
  LOCK_MINUTES,
} from "@/lib/auth";
import {
  recordFailedAttempt,
  getFailedAttempts,
  lockAccount,
  clearFailedAttempts,
  getTotalFailedAttemptsForIp,
} from "@/lib/services/sqlite-store";

const IP_ATTEMPT_LIMIT = 20;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body || {};
    const ip = getClientIp(req);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    const emailLower = String(email).toLowerCase().trim();

    // IP-level protection (covers the "no such email" brute force case)
    const ipAttempts = getTotalFailedAttemptsForIp(ip);
    if (ipAttempts >= IP_ATTEMPT_LIMIT) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later.", locked: true },
        { status: 429 }
      );
    }

    // Account-level lockout
    const attempts = getFailedAttempts(emailLower);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      return NextResponse.json(
        {
          success: false,
          error: "Account temporarily locked. Try again in a few minutes.",
          locked: true,
        },
        { status: 429 }
      );
    }

    const user = getUserByEmail(emailLower);

    const passwordOk = user
      ? verifyPassword(password, user.password_hash ?? user.password)
      : false;

    if (!user || !passwordOk) {
      const newAttempts = user ? recordFailedAttempt(emailLower, ip) : recordFailedAttempt(emailLower, ip);
      if (user && newAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockAccount(emailLower, LOCK_MINUTES);
        return NextResponse.json(
          {
            success: false,
            error: "Account temporarily locked. Try again in a few minutes.",
            locked: true,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Lazy-upgrade legacy plaintext password to scrypt hash
    await ensurePasswordUpgraded(emailLower, password, user.password_hash ?? user.password);

    clearFailedAttempts(emailLower);

    const token = issueSession(user.id, "user");
    const res = NextResponse.json({
      success: true,
      id: user.id,
      email: user.email,
      name: user.name,
      business_type: user.business_type,
    });
    setSessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}