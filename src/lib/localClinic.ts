/**
 * localClinic.ts
 * All clinic/doctor data stored in SQLite — no Supabase, no Google OAuth required.
 */
import {
  upsertDoctor,
  getDoctorById,
  getDoctorByEmail,
  getDoctorByPhone,
  saveTokens,
  getTokens,
  updateDoctorSheetColumns,
  type ClinicDoctor,
  type GoogleTokens,
} from "./services/sqlite-store";

export type { ClinicDoctor };

// ── Doctor CRUD ──────────────────────────────────────────────────────────────

export async function upsertDoctorByEmail(
  input: Partial<ClinicDoctor> & { email: string }
): Promise<ClinicDoctor> {
  return upsertDoctor(input);
}

export async function getDoctorByIdLocal(id: string): Promise<ClinicDoctor | null> {
  return getDoctorById(id);
}

export async function getDoctorByEmailLocal(email: string): Promise<ClinicDoctor | null> {
  return getDoctorByEmail(email);
}

export async function getDoctorByPhoneLocal(phone: string): Promise<ClinicDoctor | null> {
  return getDoctorByPhone(phone);
}

// ── Token storage (local, replaces Supabase clinic_doctor_tokens) ────────────

export type GoogleOAuthTokens = Omit<GoogleTokens, "doctor_id">;

export async function saveDoctorTokens(
  doctorId: string,
  tokens: GoogleOAuthTokens
): Promise<void> {
  saveTokens(doctorId, tokens);
}

export async function getDoctorTokens(
  doctorId: string
): Promise<GoogleOAuthTokens | null> {
  return getTokens(doctorId);
}

// ── Sheet columns sync (local) ───────────────────────────────────────────────

export async function syncSheetColumnsLocal(params: {
  doctorId: string;
  columns: string[];
}): Promise<string[]> {
  updateDoctorSheetColumns(params.doctorId, params.columns);
  return params.columns;
}
