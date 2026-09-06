import { NextResponse } from "next/server";
import { updateUserBusiness, getUserById } from "@/lib/services/sqlite-store";
import { upsertDoctorByEmail } from "@/lib/localClinic";
import { requireSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const body = await req.json();
    const { businessType } = body;

    if (!businessType) {
      return NextResponse.json(
        { success: false, error: "Missing businessType" },
        { status: 400 }
      );
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    updateUserBusiness(userId, businessType);

    // Create the doctor record so the clinic setup page works for
    // email/password users (no Google OAuth cookie required).
    if (businessType === "clinic") {
      await upsertDoctorByEmail({
        email: user.email,
        name: user.name,
        timezone: "Asia/Karachi",
        sheet_columns: ["name", "phone", "date"],
      });
    }

    return NextResponse.json({ success: true, businessType });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
