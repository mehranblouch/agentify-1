import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "clinic.sqlite");
let db: Database.Database | null = null;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  name: string;
  password: string;
  business_type: "clinic" | "education" | null;
  created_at: string;
};

export type ClinicDoctor = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  timezone: string;
  info_box: {
    location?: string;
    timings?: string;
    fee?: string;
    daily_appointments?: number;
  };
  sheet_columns: string[];
};

export type GoogleTokens = {
  doctor_id: string;
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_date: number | null;
};

export type ClinicSettings = {
  user_id: string;
  clinic_name: string;
  consultation_fee: string;
  slot_duration_mins: number;
  daily_quota: number;
  start_time: string;
  end_time: string;
  custom_rules: string;
  whatsapp_number: string;
  location: string;
  timings: string;
  google_sheet_id: string;
};

export type EducationSettings = {
  user_id: string;
  institute_name: string;
  address: string;
  timings: string;
  info_box: string;
  whatsapp_number: string;
};

export type Student = {
  id: string;
  user_id: string;
  name: string;
  father_name: string;
  phone: string;
  created_at: string;
};

export type AttendanceLog = {
  id: string;
  user_id: string;
  student_id: string;
  date: string;
  status: "present" | "absent";
  notified: boolean;
};

export type MessageLog = {
  id: string;
  user_id: string;
  direction: "incoming" | "outgoing";
  phone: string;
  content: string;
  created_at: string;
};

export type Appointment = {
  id: string;
  user_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  age?: string;
  symptoms: string;
  status?: string;
  booking_ref?: string;
  booked_at: string;
  source: string;
  whatsapp_jid: string;
};

// ─────────────────────────────────────────────
// DB Initialisation
// ─────────────────────────────────────────────

function getDb() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Users table
  db.prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      business_type TEXT,
      created_at TEXT NOT NULL
    )`
  ).run();

  // Clinic doctors
  db.prepare(
    `CREATE TABLE IF NOT EXISTS clinic_doctors (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'Asia/Karachi',
      info_box TEXT DEFAULT '{}',
      sheet_columns TEXT DEFAULT '["name","phone","date"]'
    )`
  ).run();

  // Google OAuth tokens
  db.prepare(
    `CREATE TABLE IF NOT EXISTS clinic_doctor_tokens (
      doctor_id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date INTEGER,
      FOREIGN KEY (doctor_id) REFERENCES clinic_doctors(id)
    )`
  ).run();

  // Clinic settings
  db.prepare(
    `CREATE TABLE IF NOT EXISTS clinic_settings (
      user_id TEXT PRIMARY KEY,
      clinic_name TEXT DEFAULT '',
      consultation_fee TEXT DEFAULT '',
      slot_duration_mins INTEGER DEFAULT 30,
      daily_quota INTEGER DEFAULT 10,
      start_time TEXT DEFAULT '09:00',
      end_time TEXT DEFAULT '17:00',
      custom_rules TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      location TEXT DEFAULT '',
      timings TEXT DEFAULT '9 AM - 5 PM',
      google_sheet_id TEXT DEFAULT ''
    )`
  ).run();

  // Migrate older DBs that lack the google_sheet_id column
  const clinicCols = db.prepare("PRAGMA table_info(clinic_settings)").all().map((c: any) => c.name);
  if (!clinicCols.includes("google_sheet_id")) {
    db.prepare("ALTER TABLE clinic_settings ADD COLUMN google_sheet_id TEXT DEFAULT ''").run();
  }

  // Appointments
  db.prepare(
    `CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT '',
      patient_name TEXT NOT NULL,
      patient_phone TEXT DEFAULT '',
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      age TEXT DEFAULT '',
      symptoms TEXT DEFAULT '',
      status TEXT DEFAULT 'booked',
      booked_at TEXT NOT NULL,
      source TEXT NOT NULL,
      whatsapp_jid TEXT DEFAULT ''
    )`
  ).run();

  // Education Settings
  db.prepare(
    `CREATE TABLE IF NOT EXISTS education_settings (
      user_id TEXT PRIMARY KEY,
      institute_name TEXT DEFAULT '',
      address TEXT DEFAULT '',
      timings TEXT DEFAULT '',
      info_box TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT ''
    )`
  ).run();

  // Students
  db.prepare(
    `CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      father_name TEXT DEFAULT '',
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  ).run();

  // Attendance Logs
  db.prepare(
    `CREATE TABLE IF NOT EXISTS attendance_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      notified INTEGER DEFAULT 0
    )`
  ).run();

  // Message logs
  db.prepare(
    `CREATE TABLE IF NOT EXISTS message_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      phone TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`
  ).run();

  // Groq API key usage tracking
  db.prepare(
    `CREATE TABLE IF NOT EXISTS groq_key_usage (
      key_index      INTEGER PRIMARY KEY,
      label          TEXT,
      calls          INTEGER DEFAULT 0,
      input_tokens   INTEGER DEFAULT 0,
      output_tokens  INTEGER DEFAULT 0,
      total_tokens   INTEGER DEFAULT 0,
      last_used      TEXT
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS groq_key_usage_per_user (
      user_id        TEXT NOT NULL,
      key_index      INTEGER NOT NULL,
      calls          INTEGER DEFAULT 0,
      input_tokens   INTEGER DEFAULT 0,
      output_tokens  INTEGER DEFAULT 0,
      total_tokens   INTEGER DEFAULT 0,
      last_used      TEXT,
      PRIMARY KEY (user_id, key_index)
    )`
  ).run();

  // Migrations for existing tables
  try {
    const info = db.prepare("PRAGMA table_info(appointments)").all() as any[];
    if (!info.some(r => r.name === "age")) {
      db.prepare("ALTER TABLE appointments ADD COLUMN age TEXT DEFAULT ''").run();
    }
    if (!info.some(r => r.name === "status")) {
      db.prepare("ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'booked'").run();
    }
    if (!info.some(r => r.name === "user_id")) {
      db.prepare("ALTER TABLE appointments ADD COLUMN user_id TEXT DEFAULT ''").run();
    }
    if (!info.some(r => r.name === "booking_ref")) {
      db.prepare("ALTER TABLE appointments ADD COLUMN booking_ref TEXT DEFAULT ''").run();
    }
  } catch (_) {}

  try {
    const info = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (!info.some(r => r.name === "business_type")) {
      db.prepare("ALTER TABLE users ADD COLUMN business_type TEXT").run();
    }
  } catch (_) {}

  try {
    const info = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (!info.some(r => r.name === "paused")) {
      db.prepare("ALTER TABLE users ADD COLUMN paused INTEGER DEFAULT 0").run();
    }
  } catch (_) {}

  try {
    const info = db.prepare("PRAGMA table_info(clinic_settings)").all() as any[];
    if (!info.some(r => r.name === "daily_quota")) {
      db.prepare("ALTER TABLE clinic_settings ADD COLUMN daily_quota INTEGER DEFAULT 10").run();
    }
  } catch (_) {}

  try {
    const info = db.prepare("PRAGMA table_info(education_settings)").all() as any[];
    if (!info.some(r => r.name === "whatsapp_number")) {
      db.prepare("ALTER TABLE education_settings ADD COLUMN whatsapp_number TEXT DEFAULT ''").run();
    }
  } catch (_) {}

  return db;
}

// ─────────────────────────────────────────────
// User CRUD
// ─────────────────────────────────────────────

export function createUser(input: Omit<User, "id" | "created_at" | "business_type">): User {
  const database = getDb();
  const user: User = {
    ...input,
    id: uuidv4(),
    business_type: null,
    created_at: new Date().toISOString(),
  };
  database
    .prepare(
      `INSERT INTO users (id, email, name, password, business_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, user.email, user.name, user.password, user.business_type, user.created_at);
  return user;
}

export function getUserByEmail(email: string): User | null {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);
  return row ? (row as User) : null;
}

export function getUserById(id: string): User | null {
  const database = getDb();
  const row = database.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return row ? (row as User) : null;
}

export function isBusinessPaused(userId: string): boolean {
  const database = getDb();
  const row = database.prepare("SELECT paused FROM users WHERE id = ?").get(userId) as any;
  return !!row?.paused;
}

export function setBusinessPaused(userId: string, paused: boolean): void {
  const database = getDb();
  database
    .prepare("UPDATE users SET paused = ? WHERE id = ?")
    .run(paused ? 1 : 0, userId);
}

export function getPausedBusinessIds(): Set<string> {
  const database = getDb();
  const rows = database.prepare("SELECT id FROM users WHERE paused = 1").all() as any[];
  return new Set(rows.map((r: any) => r.id));
}

// ─────────────────────────────────────────────
// Clinic Doctor CRUD
// ─────────────────────────────────────────────

export function upsertDoctor(
  input: Partial<ClinicDoctor> & { email: string }
): ClinicDoctor {
  const database = getDb();
  const existing = database
    .prepare("SELECT * FROM clinic_doctors WHERE email = ?")
    .get(input.email) as any;

  if (existing) {
    const merged = {
      id: existing.id,
      email: input.email,
      name: input.name ?? existing.name,
      phone: input.phone ?? existing.phone,
      timezone: input.timezone ?? existing.timezone,
      info_box: JSON.stringify(
        input.info_box ?? JSON.parse(existing.info_box || "{}")
      ),
      sheet_columns: JSON.stringify(
        input.sheet_columns ?? JSON.parse(existing.sheet_columns || '["name","phone","date"]')
      ),
    };
    database
      .prepare(
        `UPDATE clinic_doctors SET
           name=?, phone=?, timezone=?, info_box=?, sheet_columns=?
         WHERE id=?`
      )
      .run(
        merged.name,
        merged.phone,
        merged.timezone,
        merged.info_box,
        merged.sheet_columns,
        merged.id
      );
    return _parseDoctor({ ...merged });
  } else {
    const doctor = {
      id: uuidv4(),
      email: input.email,
      name: input.name ?? null,
      phone: input.phone ?? null,
      timezone: input.timezone ?? "Asia/Karachi",
      info_box: JSON.stringify(input.info_box ?? {}),
      sheet_columns: JSON.stringify(
        input.sheet_columns ?? ["name", "phone", "date"]
      ),
    };
    database
      .prepare(
        `INSERT INTO clinic_doctors (id, email, name, phone, timezone, info_box, sheet_columns)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        doctor.id,
        doctor.email,
        doctor.name,
        doctor.phone,
        doctor.timezone,
        doctor.info_box,
        doctor.sheet_columns
      );
    return _parseDoctor(doctor);
  }
}

export function getDoctorById(id: string): ClinicDoctor | null {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM clinic_doctors WHERE id = ?")
    .get(id);
  return row ? _parseDoctor(row as any) : null;
}

export function getDoctorByEmail(email: string): ClinicDoctor | null {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM clinic_doctors WHERE email = ?")
    .get(email);
  return row ? _parseDoctor(row as any) : null;
}

export function getDoctorByPhone(phone: string): ClinicDoctor | null {
  const database = getDb();
  const clean = phone.replace(/\D/g, "");
  const row = database
    .prepare(
      `SELECT * FROM clinic_doctors WHERE
       REPLACE(REPLACE(phone, '+', ''), '-', '') LIKE ?`
    )
    .get(`%${clean}%`);
  return row ? _parseDoctor(row as any) : null;
}

export function updateDoctorSheetColumns(
  doctorId: string,
  columns: string[]
): void {
  const database = getDb();
  database
    .prepare(
      "UPDATE clinic_doctors SET sheet_columns=? WHERE id=?"
    )
    .run(JSON.stringify(columns), doctorId);
}

function _parseDoctor(row: any): ClinicDoctor {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    timezone: row.timezone,
    info_box:
      typeof row.info_box === "string"
        ? JSON.parse(row.info_box || "{}")
        : row.info_box ?? {},
    sheet_columns:
      typeof row.sheet_columns === "string"
        ? JSON.parse(row.sheet_columns || '["name","phone","date"]')
        : row.sheet_columns ?? ["name", "phone", "date"],
  };
}

// ─────────────────────────────────────────────
// Google Token CRUD (stored locally)
// ─────────────────────────────────────────────

export function saveTokens(doctorId: string, tokens: Omit<GoogleTokens, "doctor_id">): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO clinic_doctor_tokens
         (doctor_id, access_token, refresh_token, scope, token_type, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(doctor_id) DO UPDATE SET
         access_token=excluded.access_token,
         refresh_token=excluded.refresh_token,
         scope=excluded.scope,
         token_type=excluded.token_type,
         expiry_date=excluded.expiry_date`
    )
    .run(
      doctorId,
      tokens.access_token ?? null,
      tokens.refresh_token ?? null,
      tokens.scope ?? null,
      tokens.token_type ?? null,
      tokens.expiry_date ?? null
    );
}

export function getTokens(doctorId: string): Omit<GoogleTokens, "doctor_id"> | null {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM clinic_doctor_tokens WHERE doctor_id = ?")
    .get(doctorId) as any;
  if (!row) return null;
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    scope: row.scope,
    token_type: row.token_type,
    expiry_date: row.expiry_date,
  };
}

// ─────────────────────────────────────────────
// Clinic Settings CRUD
// ─────────────────────────────────────────────

export function getClinicSettings(userId = "default"): ClinicSettings {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM clinic_settings WHERE user_id = ?")
    .get(userId) as any;

  if (row) return row as ClinicSettings;

  const defaults: ClinicSettings = {
    user_id: userId,
    clinic_name: "",
    consultation_fee: "",
    slot_duration_mins: 30,
    daily_quota: 10,
    start_time: "09:00",
    end_time: "17:00",
    custom_rules: "",
    whatsapp_number: "",
    location: "",
    timings: "9 AM - 5 PM",
    google_sheet_id: "",
  };

  database
    .prepare(
      `INSERT OR IGNORE INTO clinic_settings
         (user_id, clinic_name, consultation_fee, slot_duration_mins, daily_quota,
          start_time, end_time, custom_rules, whatsapp_number, location, timings, google_sheet_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      defaults.user_id,
      defaults.clinic_name,
      defaults.consultation_fee,
      defaults.slot_duration_mins,
      defaults.daily_quota,
      defaults.start_time,
      defaults.end_time,
      defaults.custom_rules,
      defaults.whatsapp_number,
      defaults.location,
      defaults.timings,
      defaults.google_sheet_id
    );

  return defaults;
}

export function saveClinicSettings(
  settings: Partial<ClinicSettings> & { user_id?: string }
) {
  const database = getDb();
  const userId = settings.user_id || "default";
  const current = getClinicSettings(userId);
  const merged: ClinicSettings = { ...current, ...settings, user_id: userId };

  database
    .prepare(
      `INSERT INTO clinic_settings
         (user_id, clinic_name, consultation_fee, slot_duration_mins, daily_quota,
          start_time, end_time, custom_rules, whatsapp_number, location, timings, google_sheet_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         clinic_name=excluded.clinic_name,
         consultation_fee=excluded.consultation_fee,
         slot_duration_mins=excluded.slot_duration_mins,
         daily_quota=excluded.daily_quota,
         start_time=excluded.start_time,
         end_time=excluded.end_time,
         custom_rules=excluded.custom_rules,
         whatsapp_number=excluded.whatsapp_number,
         location=excluded.location,
         timings=excluded.timings,
         google_sheet_id=excluded.google_sheet_id`
    )
    .run(
      merged.user_id,
      merged.clinic_name,
      merged.consultation_fee,
      merged.slot_duration_mins,
      merged.daily_quota,
      merged.start_time,
      merged.end_time,
      merged.custom_rules,
      merged.whatsapp_number,
      merged.location,
      merged.timings,
      merged.google_sheet_id
    );

  return merged;
}

export function updateUserBusiness(userId: string, businessType: "clinic" | "education") {
  const database = getDb();
  database.prepare("UPDATE users SET business_type = ? WHERE id = ?").run(businessType, userId);
}

// ─────────────────────────────────────────────
// Appointment CRUD
// ─────────────────────────────────────────────

export function getAppointmentByPhoneAndDate(
  userId: string,
  patientPhone: string,
  appointmentDate: string
): Appointment | null {
  const database = getDb();
  const cleaned = patientPhone.replace(/\D/g, "");
  const row = database
    .prepare(
      `SELECT * FROM appointments WHERE (user_id = ? OR user_id = '') AND REPLACE(patient_phone, '+', '') LIKE ? AND appointment_date = ? AND status != 'cancelled' ORDER BY booked_at DESC LIMIT 1`
    )
    .get(userId, `%${cleaned}%`, appointmentDate);
  return row ? (row as Appointment) : null;
}

export function saveAppointment(
  input: Omit<Appointment, "id" | "booked_at">
): Appointment {
  const database = getDb();
  const appointment: Appointment = {
    ...input,
    id: uuidv4(),
    booked_at: new Date().toISOString(),
  };

  database
    .prepare(
      `INSERT INTO appointments
         (id, user_id, patient_name, patient_phone, appointment_date,
          appointment_time, age, symptoms, booked_at, source, whatsapp_jid, booking_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      appointment.id,
      appointment.user_id,
      appointment.patient_name,
      appointment.patient_phone,
      appointment.appointment_date,
      appointment.appointment_time,
      appointment.age ?? "",
      appointment.symptoms,
      appointment.booked_at,
      appointment.source,
      appointment.whatsapp_jid,
      appointment.booking_ref ?? ""
    );

  return appointment;
}

export function getAllAppointments(userId: string, patientPhone?: string): Appointment[] {
  const database = getDb();
  if (patientPhone) {
    const cleaned = patientPhone.replace(/\D/g, "");
    return database
      .prepare(
        `SELECT * FROM appointments WHERE (user_id = ? OR user_id = '') AND REPLACE(patient_phone, '+', '') LIKE ? ORDER BY booked_at DESC`
      )
      .all(userId, `%${cleaned}%`)
      .map((row: any) => row as Appointment);
  }
  return database
    .prepare("SELECT * FROM appointments WHERE (user_id = ? OR user_id = '') ORDER BY booked_at DESC")
    .all(userId)
    .map((row: any) => row as Appointment);
}

export function getPatientInfo(userId: string, patientPhone: string): Appointment | null {
  const database = getDb();
  const cleaned = patientPhone.replace(/\D/g, "");
  const row = database
    .prepare(
      `SELECT * FROM appointments WHERE (user_id = ? OR user_id = '') AND REPLACE(patient_phone, '+', '') LIKE ? ORDER BY booked_at DESC LIMIT 1`
    )
    .get(userId, `%${cleaned}%`);
  return row ? (row as Appointment) : null;
}

// Human-friendly booking reference. For new bookings the AI agent generates a
// code (e.g. "APT-X7K3Q9") which is stored in the booking_ref column. For older
// bookings without a stored ref, we derive a stable code from the id so they
// stay addressable too.
export function bookingReferenceOf(id: string, bookingRef?: string): string {
  const stored = (bookingRef || "").trim();
  if (stored) return stored.toUpperCase();
  return `APT-${(id || "").replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// Generate a fresh booking reference when none was supplied by the AI.
export function generateBookingRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `APT-${code}`;
}

// Normalize a user-provided reference (e.g. "APT-X7K3Q9", "apt-x7k3q9",
// "X7K3Q9", or a raw uuid) into a comparable key.
function normalizeRef(ref: string): string {
  return String(ref || "").replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

export function getAppointmentByReference(userId: string, ref: string): Appointment | null {
  const key = normalizeRef(ref);
  if (!key) return null;
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT * FROM appointments WHERE (user_id = ? OR user_id = '') AND status != 'cancelled' ORDER BY booked_at DESC`
    )
    .all(userId) as any[];
  // 1) Exact match on the stored booking_ref first.
  for (const row of rows) {
    if (normalizeRef((row.booking_ref || "").replace(/^APT[- ]?/i, "")) === key.replace(/^APT[- ]?/i, "")) {
      return row as Appointment;
    }
  }
  // 2) Fall back to a reference derived from the id (covers old bookings).
  for (const row of rows) {
    if (bookingReferenceOf(row.id, row.booking_ref) === key) {
      return row as Appointment;
    }
  }
  // 3) Raw uuid/id prefix match.
  const byPrefix = database
    .prepare(
      `SELECT * FROM appointments WHERE id LIKE ? AND (user_id = ? OR user_id = '') AND status != 'cancelled' ORDER BY booked_at DESC LIMIT 1`
    )
    .get(`${key.toLowerCase()}%`, userId) as any;
  return byPrefix ? (byPrefix as Appointment) : null;
}

// Cancel an appointment by its reference. Returns the cancelled row, or null
// if no active (non-cancelled) appointment matched that reference.
export function cancelAppointmentById(userId: string, ref: string): Appointment | null {
  const appointment = getAppointmentByReference(userId, ref);
  if (!appointment) return null;
  const database = getDb();
  database.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appointment.id);
  return { ...appointment, status: "cancelled" };
}

// ─────────────────────────────────────────────
// User / Business Lookup
// ─────────────────────────────────────────────

export function assignWhatsAppNumberToBusiness(userId: string, businessType: "clinic" | "education", cleanNumber: string) {
  const database = getDb();

  // One WhatsApp number = one business. Remove this number from EVERY other
  // business row (both clinic & education), regardless of format (+ prefix,
  // spaces, with/without country code), so stale duplicates can't hijack the
  // routing. We compare on the last 12 normalized digits.
  const target = cleanNumber.replace(/\D/g, "").slice(-12);

  const clearClinic = database.prepare(
    `UPDATE clinic_settings SET whatsapp_number = ''
     WHERE whatsapp_number != '' AND REPLACE(REPLACE(whatsapp_number, '+', ''), ' ', '') LIKE ?`
  );
  const clearEdu = database.prepare(
    `UPDATE education_settings SET whatsapp_number = ''
     WHERE whatsapp_number != '' AND REPLACE(REPLACE(whatsapp_number, '+', ''), ' ', '') LIKE ?`
  );
  const likeTarget = `%${target}%`;

  // Only clear rows whose stored number actually refers to THIS number, so we
  // never wipe out an unrelated number that merely shares a suffix.
  for (const row of database.prepare("SELECT user_id, whatsapp_number FROM clinic_settings WHERE whatsapp_number != ''").all() as any[]) {
    if (row.user_id !== userId && (row.whatsapp_number || "").replace(/\D/g, "").slice(-12) === target) {
      clearClinic.run(likeTarget);
    }
  }
  for (const row of database.prepare("SELECT user_id, whatsapp_number FROM education_settings WHERE whatsapp_number != ''").all() as any[]) {
    if (row.user_id !== userId && (row.whatsapp_number || "").replace(/\D/g, "").slice(-12) === target) {
      clearEdu.run(likeTarget);
    }
  }

  // Assign to the correct business
  if (businessType === "clinic") {
    const existing = getClinicSettings(userId);
    saveClinicSettings({ ...existing, user_id: userId, whatsapp_number: cleanNumber });
  } else if (businessType === "education") {
    const existing = getEducationSettings(userId);
    saveEducationSettings({ ...existing, user_id: userId, whatsapp_number: cleanNumber });
  }
}

export function getUserByWhatsAppNumber(phone: string): { userId: string, businessType: "clinic" | "education" } {
  const database = getDb();
  const cleanPhone = phone.replace(/\D/g, "");
  const last9 = cleanPhone.slice(-9);

  type Profile = {
    userId: string;
    businessType: "clinic" | "education";
    // "configured" means the row has an actual name/profile set, so the AI
    // agent can reply with real info (clinic name, timings, fees, rules).
    configured: boolean;
  };
  // Remember the exact stored number so we can tell exact vs fuzzy matches apart.
  type Candidate = Profile & { storedClean: string };
  const candidates: Candidate[] = [];

  const edus = database.prepare("SELECT user_id, whatsapp_number, institute_name FROM education_settings").all() as any[];
  for (const e of edus) {
    const eClean = (e.whatsapp_number || "").replace(/\D/g, "");
    if (!eClean) continue;
    if (eClean === cleanPhone) {
      candidates.push({ userId: e.user_id, businessType: "education", configured: !!(e.institute_name && String(e.institute_name).trim()), storedClean: eClean });
    } else if (last9.length >= 9 && eClean.length >= 10 && eClean.endsWith(last9)) {
      candidates.push({ userId: e.user_id, businessType: "education", configured: !!(e.institute_name && String(e.institute_name).trim()), storedClean: eClean, fuzzy: true } as any);
    }
  }

  const clinics = database.prepare("SELECT user_id, whatsapp_number, clinic_name FROM clinic_settings").all() as any[];
  for (const c of clinics) {
    const cClean = (c.whatsapp_number || "").replace(/\D/g, "");
    if (!cClean) continue;
    if (cClean === cleanPhone) {
      candidates.push({ userId: c.user_id, businessType: "clinic", configured: !!(c.clinic_name && String(c.clinic_name).trim()), storedClean: cClean });
    } else if (last9.length >= 9 && cClean.length >= 10 && cClean.endsWith(last9)) {
      candidates.push({ userId: c.user_id, businessType: "clinic", configured: !!(c.clinic_name && String(c.clinic_name).trim()), storedClean: cClean, fuzzy: true } as any);
    }
  }

  // Must have matched at least one stored business.
  if (candidates.length === 0) {
    return { userId: "default", businessType: "clinic" };
  }

  // 1) Prefer EXACT full-number matches. Two businesses must never share an
  //    exact number; if multiple exact matches exist, keep them configured-first
  //    but prefer a distinct, non-default one so pausing one account can never
  //    bleed into another.
  const exact = candidates.filter((c) => !(c as any).fuzzy);
  if (exact.length > 0) {
    const exactConfigured = exact.filter((c) => c.configured);
    const exactPool = exactConfigured.length > 0 ? exactConfigured : exact;
    // Deduplicate by userId so a single account is never double-counted.
    const byUser = new Map<string, Candidate>();
    for (const c of exactPool) byUser.set(c.userId, c);
    const unique = Array.from(byUser.values());
    if (unique.length === 1) {
      return { userId: unique[0].userId, businessType: unique[0].businessType };
    }
    // Multiple DIFFERENT accounts claim the exact same number — ambiguous.
    // Prefer a non-default account (real user) over the default/test row.
    const real = unique.filter((c) => c.userId !== "default" && c.userId !== "00000000-0000-0000-0000-000000000000");
    const chosen = (real.length > 0 ? real : unique)[0];
    return { userId: chosen.userId, businessType: chosen.businessType };
  }

  // 2) Otherwise fall back to fuzzy (by last 9 digits) ONLY when it resolves to
  //    exactly ONE distinct account. If multiple different businesses share the
  //    same 9-digit suffix, we must NOT guess — guessing could route a message
  //    to the wrong (e.g. paused) business and break pause isolation.
  const byUserFuzzy = new Map<string, Candidate>();
  for (const c of candidates) byUserFuzzy.set(c.userId, c);
  const fuzzyUnique = Array.from(byUserFuzzy.values());
  if (fuzzyUnique.length === 1) {
    return { userId: fuzzyUnique[0].userId, businessType: fuzzyUnique[0].businessType };
  }

  // 3) Ambiguous fuzzy match across several accounts — treat as unassigned so
  //    we never leak one business's traffic (or pause state) into another.
  return { userId: "default", businessType: "clinic" };
}

// ─────────────────────────────────────────────
// Education Settings CRUD
// ─────────────────────────────────────────────

export function getEducationSettings(userId = "default"): EducationSettings {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM education_settings WHERE user_id = ?")
    .get(userId);

  if (row) return row as EducationSettings;

  const defaults: EducationSettings = {
    user_id: userId,
    institute_name: "",
    address: "",
    timings: "",
    info_box: "",
    whatsapp_number: "",
  };

  database
    .prepare(
      `INSERT OR IGNORE INTO education_settings
         (user_id, institute_name, address, timings, info_box, whatsapp_number)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      defaults.user_id,
      defaults.institute_name,
      defaults.address,
      defaults.timings,
      defaults.info_box,
      defaults.whatsapp_number
    );

  return defaults;
}

export function saveEducationSettings(
  settings: Partial<EducationSettings> & { user_id?: string }
) {
  const database = getDb();
  const userId = settings.user_id || "default";
  const current = getEducationSettings(userId);
  const merged: EducationSettings = { ...current, ...settings, user_id: userId };

  database
    .prepare(
      `INSERT INTO education_settings
         (user_id, institute_name, address, timings, info_box, whatsapp_number)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         institute_name=excluded.institute_name,
         address=excluded.address,
         timings=excluded.timings,
         info_box=excluded.info_box,
         whatsapp_number=excluded.whatsapp_number`
    )
    .run(
      merged.user_id,
      merged.institute_name,
      merged.address,
      merged.timings,
      merged.info_box,
      merged.whatsapp_number
    );

  return merged;
}

// ─────────────────────────────────────────────
// Student CRUD
// ─────────────────────────────────────────────

export function getStudents(userId: string): Student[] {
  const database = getDb();
  return database
    .prepare("SELECT * FROM students WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId)
    .map((row: any) => row as Student);
}

export function saveStudent(input: Omit<Student, "id" | "created_at">): Student {
  const database = getDb();
  const student: Student = {
    ...input,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };

  database
    .prepare(
      `INSERT INTO students (id, user_id, name, father_name, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(student.id, student.user_id, student.name, student.father_name, student.phone, student.created_at);

  return student;
}

export function deleteStudent(id: string, userId: string): void {
  const database = getDb();
  database.prepare("DELETE FROM students WHERE id = ? AND user_id = ?").run(id, userId);
}

// ─────────────────────────────────────────────
// Attendance CRUD
// ─────────────────────────────────────────────

export function markAttendance(
  userId: string,
  studentId: string,
  date: string,
  status: "present" | "absent"
): AttendanceLog {
  const database = getDb();
  
  // Check if exists
  const existing = database
    .prepare("SELECT * FROM attendance_logs WHERE user_id = ? AND student_id = ? AND date = ?")
    .get(userId, studentId, date) as any;

  if (existing) {
    database
      .prepare("UPDATE attendance_logs SET status = ?, notified = 0 WHERE id = ?")
      .run(status, existing.id);
    return { ...existing, status, notified: false } as AttendanceLog;
  }

  const log: AttendanceLog = {
    id: uuidv4(),
    user_id: userId,
    student_id: studentId,
    date,
    status,
    notified: false,
  };

  database
    .prepare(
      `INSERT INTO attendance_logs (id, user_id, student_id, date, status, notified)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(log.id, log.user_id, log.student_id, log.date, log.status, log.notified ? 1 : 0);

  return log;
}

export function getAttendanceLogs(userId: string, date: string): AttendanceLog[] {
  const database = getDb();
  return database
    .prepare("SELECT * FROM attendance_logs WHERE user_id = ? AND date = ?")
    .all(userId, date)
    .map((row: any) => ({ ...row, notified: !!row.notified } as AttendanceLog));
}

export function markNotified(logId: string) {
  const database = getDb();
  database.prepare("UPDATE attendance_logs SET notified = 1 WHERE id = ?").run(logId);
}

// ─────────────────────────────────────────────
// Message Logging
// ─────────────────────────────────────────────

export function logMessage(
  userId: string,
  direction: "incoming" | "outgoing",
  phone: string,
  content: string
): MessageLog {
  const database = getDb();
  const log: MessageLog = {
    id: uuidv4(),
    user_id: userId,
    direction,
    phone,
    content: content.slice(0, 500),
    created_at: new Date().toISOString(),
  };
  database
    .prepare(
      `INSERT INTO message_logs (id, user_id, direction, phone, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(log.id, log.user_id, log.direction, log.phone, log.content, log.created_at);
  return log;
}

export function getMessageStats(userId: string): { incoming: number; outgoing: number } {
  const database = getDb();
  const incoming = (
    database
      .prepare("SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND direction = 'incoming'")
      .get(userId) as any
  )?.count || 0;
  const outgoing = (
    database
      .prepare("SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND direction = 'outgoing'")
      .get(userId) as any
  )?.count || 0;
  return { incoming, outgoing };
}

export function getAllBusinessMessageStats(): { user_id: string; incoming: number; outgoing: number }[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT user_id,
              SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
              SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
       FROM message_logs
       GROUP BY user_id`
    )
    .all() as any[];
  return rows.map((r: any) => ({ user_id: r.user_id, incoming: r.incoming, outgoing: r.outgoing }));
}

// ─────────────────────────────────────────────
// Groq API key usage tracking
// ─────────────────────────────────────────────

export type GroqKeyUsage = {
  key_index: number;
  label: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  last_used: string | null;
};

export function recordGroqKeyCall(
  keyIndex: number,
  label: string,
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
  userId?: string
): void {
  const database = getDb();
  const prompt = usage?.prompt_tokens || 0;
  const completion = usage?.completion_tokens || 0;
  const total = usage?.total_tokens || prompt + completion;
  const now = new Date().toISOString();

  database
    .prepare(
      `INSERT INTO groq_key_usage (key_index, label, calls, input_tokens, output_tokens, total_tokens, last_used)
       VALUES (?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(key_index) DO UPDATE SET
         label = excluded.label,
         calls = calls + 1,
         input_tokens = input_tokens + excluded.input_tokens,
         output_tokens = output_tokens + excluded.output_tokens,
         total_tokens = total_tokens + excluded.total_tokens,
         last_used = excluded.last_used`
    )
    .run(keyIndex, label, prompt, completion, total, now);

  if (userId) {
    database
      .prepare(
        `INSERT INTO groq_key_usage_per_user (user_id, key_index, calls, input_tokens, output_tokens, total_tokens, last_used)
         VALUES (?, ?, 1, ?, ?, ?, ?)
         ON CONFLICT(user_id, key_index) DO UPDATE SET
           calls = calls + 1,
           input_tokens = input_tokens + excluded.input_tokens,
           output_tokens = output_tokens + excluded.output_tokens,
           total_tokens = total_tokens + excluded.total_tokens,
           last_used = excluded.last_used`
      )
      .run(userId, keyIndex, prompt, completion, total, now);
  }
}

export function getBusinessTokenUsage(userId: string): number {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT SUM(total_tokens) as total FROM groq_key_usage_per_user WHERE user_id = ?`
    )
    .get(userId) as any;
  return Math.round(row?.total || 0);
}

export function getAllGroqKeyUsage(): GroqKeyUsage[] {
  const database = getDb();
  return database
    .prepare("SELECT * FROM groq_key_usage ORDER BY key_index ASC")
    .all()
    .map((row: any) => ({
      key_index: row.key_index,
      label: row.label,
      calls: row.calls,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      total_tokens: row.total_tokens,
      last_used: row.last_used,
    }));
}

export function resetGroqKeyUsage(keyIndex?: number): void {
  const database = getDb();
  if (typeof keyIndex === "number") {
    database.prepare("DELETE FROM groq_key_usage WHERE key_index = ?").run(keyIndex);
  } else {
    database.prepare("DELETE FROM groq_key_usage").run();
  }
}
