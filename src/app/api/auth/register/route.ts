import { NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/services/sqlite-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body || {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const allowedDomains = [".com", ".net", ".org", ".edu", ".gov", ".mil", ".int", ".ai", ".io", ".co", ".info", ".biz"];
    const allowedCCTLDs = ["uk", "us", "ca", "au", "in", "de", "fr", "jp", "cn", "br", "ru", "za", "nz", "sg", "my", "ae"];
    const emailLower = email.toLowerCase();
    const domainPart = emailLower.split("@")[1];
    if (!domainPart) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    const tldMatch = domainPart.match(/\.([a-z0-9-]+)$/);
    const tld = tldMatch ? tldMatch[1] : "";
    const valid = allowedDomains.some((d) => domainPart.endsWith(d)) || allowedCCTLDs.includes(tld);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Please use a supported email domain (e.g. .com, .edu, .ai, or a country domain)." },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const user = createUser({ name, email, password });

    return NextResponse.json({
      success: true,
      id: user.id,
      email: user.email,
      name: user.name,
      business_type: user.business_type,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
