"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  age: string;
  symptoms: string;
  status: string;
  booked_at: string;
  source: string;
  booking_ref?: string;
};

function bookingRefOf(apt: Appointment): string {
  const stored = (apt.booking_ref || "").trim();
  if (stored) return stored;
  return `APT-${(apt.id || "").replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"all" | "today" | "tomorrow" | "week">("all");

  useEffect(() => {
    const userStr = sessionStorage.getItem("agentify_current_user");
    if (!userStr) {
      setLoading(false);
      return;
    }
    try {
      const user = JSON.parse(userStr);
      fetch(`/api/appointments?userId=${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setAppointments(data.appointments);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, []);

  // Relative-date helpers (browser-local timezone)
  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const todayStr = toLocalDateStr(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toLocalDateStr(tomorrow);
  const weekEnds = new Date();
  weekEnds.setDate(weekEnds.getDate() + 7);
  const weekEndStr = toLocalDateStr(weekEnds);

  const dayLabel = (dateStr: string) => {
    if (dateStr === todayStr) return "Today";
    if (dateStr === tomorrowStr) return "Tomorrow";
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };

  const visibleAppointments = [...appointments].sort((a, b) => {
    const ka = `${a.appointment_date} ${a.appointment_time || ""}`;
    const kb = `${b.appointment_date} ${b.appointment_time || ""}`;
    return ka.localeCompare(kb);
  }).filter((apt) => {
    if (view === "today") return apt.appointment_date === todayStr;
    if (view === "tomorrow") return apt.appointment_date === tomorrowStr;
    if (view === "week") return apt.appointment_date >= todayStr && apt.appointment_date <= weekEndStr;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Appointments</h2>
          <p className="text-text-secondary">Manage bookings made by your AI agent.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-text-secondary">Show:</label>
          <select
            id="sort"
            value={view}
            onChange={(e) => setView(e.target.value as "all" | "today" | "tomorrow" | "week")}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This week</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[640px]">
          <thead className="bg-background text-text-secondary font-medium border-b border-border">
            <tr>
              <th className="px-6 py-4">Ref</th>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">Loading...</td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">No appointments yet.</td>
              </tr>
            ) : visibleAppointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">No appointments for this time range.</td>
              </tr>
            ) : (
              visibleAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center text-xs font-mono text-text-secondary bg-background border border-border rounded-md px-2 py-1">
                      {bookingRefOf(apt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${apt.status === "cancelled" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                      {(apt.patient_name || "?").charAt(0)}
                    </div>
                    {apt.patient_name}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{apt.patient_phone}</td>
                  <td className="px-6 py-4 text-text-secondary">
                    <span className="font-medium text-text-primary">{dayLabel(apt.appointment_date)}</span>{" "}
                    {apt.appointment_time && `at ${apt.appointment_time}`}
                  </td>
                  <td className="px-6 py-4">
                    {apt.status === "cancelled" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium px-2 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                        Cancelled
                      </span>
                    ) : apt.status === "confirmed" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-500 font-medium px-2 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                        {apt.status === "booked" ? "Booked" : apt.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
