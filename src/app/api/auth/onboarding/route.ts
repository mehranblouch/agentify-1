import { NextResponse } from "next/server";
import { updateUserBusiness, getUserById } from "@/lib/services/sqlite-store";
import { upsertDoctorByEmail } from "@/lib/localClinic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, businessType } = body;

    if (!userId || !businessType) {
      return NextResponse.json(
        { success: false, error: "Missing userId or businessType" },
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
