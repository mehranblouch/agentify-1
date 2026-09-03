import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getDoctorByIdLocal,
  getDoctorByEmailLocal,
  upsertDoctorByEmail,
  syncSheetColumnsLocal,
  type ClinicDoctor,
} from "@/lib/localClinic";
import {
  saveClinicSettings,
  getUserById,
  type User,
} from "@/lib/services/sqlite-store";

async function getDoctorIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("clinic_doctor_id")?.value ?? null;
}

// Resolve the doctor for email/password users by looking up their user
// record (stored in localStorage as agentify_current_user) and matching on
// email. Google OAuth users keep being resolved via the clinic_doctor_id cookie.
async function resolveDoctor(userId?: string): Promise<{
  existing: ClinicDoctor | null;
  user: User | null;
}> {
  const doctorId = await getDoctorIdFromCookie();
  if (doctorId) {
    const doctor = await getDoctorByIdLocal(doctorId);
    return { existing: doctor, user: null };
  }

  if (!userId) return { existing: null, user: null };

  const user = getUserById(userId);
  if (!user) return { existing: null, user: null };

  const doctor = await getDoctorByEmailLocal(user.email);
  return { existing: doctor, user };
}

export async function GET(req: Request) {
  try {
    const doctorId = await getDoctorIdFromCookie();
    if (doctorId) {
      const doctor = await getDoctorByIdLocal(doctorId);
      return NextResponse.json({ doctor }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    if (userId) {
      const user = getUserById(userId);
      const doctor = user ? await getDoctorByEmailLocal(user.email) : null;
      return NextResponse.json({ doctor }, { status: 200 });
    }

    return NextResponse.json({ doctor: null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { existing, user } = await resolveDoctor(body.user_id);

    if (!existing && !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = existing?.email ?? user!.email;

    const updated = await upsertDoctorByEmail({
      email,
      name: body.name ?? existing?.name ?? user?.name ?? null,
      phone: body.phone ?? existing?.phone ?? null,
      timezone: body.timezone ?? existing?.timezone ?? "Asia/Karachi",
      info_box: body.info_box ?? existing?.info_box ?? {},
      sheet_columns: existing?.sheet_columns ?? ["name", "phone", "date"],
    });

    // Sync relevant fields to clinic_settings using user_id from the client
    const infoBox = body.info_box ?? existing?.info_box ?? {};
    saveClinicSettings({
      user_id: body.user_id || user?.id || existing?.id || "default",
      clinic_name: body.name || existing?.name || user?.name || "",
      consultation_fee: infoBox.fee || "",
      daily_quota: infoBox.daily_appointments || 10,
      location: infoBox.location || "",
      timings: infoBox.timings || "",
      whatsapp_number: body.phone || existing?.phone || "",
    });

    return NextResponse.json({ doctor: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { existing, user } = await resolveDoctor(body.user_id);

    if (!existing && !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // If the doctor record doesn't exist yet, create it from the user so
    // column sync works for newly registered accounts too.
    let doctor = existing;
    if (!doctor && user) {
      doctor = await upsertDoctorByEmail({
        email: user.email,
        name: user.name,
        timezone: "Asia/Karachi",
        sheet_columns: ["name", "phone", "date"],
      });
    }

    const columns: string[] = body.columns ?? [];

    if (!columns.length) {
      return NextResponse.json({ error: "No columns provided" }, { status: 400 });
    }

    const synced = await syncSheetColumnsLocal({ doctorId: doctor!.id, columns });
    return NextResponse.json({ columns: synced }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
