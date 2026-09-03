// Forward to SQLite store (supersedes old JSON file store)
export { getAllAppointments, saveAppointment, type Appointment } from "./sqlite-store";
