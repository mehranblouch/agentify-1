"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, Save, MessageSquare, X,
  MapPin, Banknote, Clock, Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

function formatNow() {
  const tz = "Asia/Karachi";
  try {
    const date = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
    const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(new Date());
    const [m, d, y] = date.split("/");
    const [h, min, s] = time.split(":");
    const meridiem = parseInt(h) >= 12 ? "PM" : "AM";
    const hour12 = ((parseInt(h) + 11) % 12) + 1;
    return {
      date: `${day}, ${y}-${m}-${d}`,
      time: `${hour12}:${min}:${s} ${meridiem}`,
    };
  } catch {
    const now = new Date();
    return {
      date: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" }),
      time: now.toLocaleTimeString("en-US", { hour12: true }),
    };
  }
}

function LiveClock() {
  const [now, setNow] = useState(() => formatNow());

  useEffect(() => {
    const interval = setInterval(() => setNow(formatNow()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="md:col-span-2 bg-card border border-border rounded-[32px] p-8 relative overflow-hidden shadow-sm">
      <div className="w-14 h-14 rounded-[20px] flex items-center justify-center mb-6 border bg-primary/10 border-primary/20 text-primary">
        <Clock className="w-7 h-7" />
      </div>
      <p className="text-3xl font-black mb-1 tracking-tighter text-white tabular-nums">
        {now.time}
      </p>
      <p className="font-black text-primary/80 text-sm mb-3">{now.date}</p>
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-text-secondary">
        <span>Current Date & Time — your AI Agent reads this and will NOT book appointments in the past.</span>
        <span className="hidden sm:flex items-center gap-1.5 text-green-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
        </span>
      </div>
    </div>
  );
}

const CLINIC_RULES_TEMPLATE = `- Doctor / Specialist Name: "Dr. Ahmed Khan" (Specialty: "General Physician & Consultant")
- Consultation Fee: "Rs. 1,000" (Payable at clinic reception via "Cash" or "Bank Transfer")
- Available Treatments: "General Consultation", "Blood Pressure Check", "Diabetes & Sugar Test", "Routine Health Checkup", "Minor Wound Dressing"
- Appointment Confirmation: "Always ask for patient Full Name, Age, and Main Symptoms before confirming the slot."
- Emergency Cases Policy: "If patient has severe pain, breathing difficulty, or emergency, reply: 'Please visit the nearest emergency room immediately!'"
- Reschedule & Cancellation: "Patients can cancel or reschedule up to 2 hours before their scheduled time."
- Communication Tone: "Warm, empathetic, polite, and reassuring like a professional medical clinic receptionist."`;

export default function ClinicDashboard() {
  const [loading, setLoading] = useState<string | null>(null);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectPhone, setConnectPhone] = useState("");
  const checkingRef = useRef(false);

  const [doctorForm, setDoctorForm] = useState({
    clinic_name: "",
    consultation_fee: "",
    slot_duration_mins: 30,
    timings: "09:00 - 17:00",
    custom_rules: "",
    location: "",
  });

  const clockTz = "Asia/Karachi";

  const getUser = () => {
    try {
      return JSON.parse(sessionStorage.getItem("agentify_current_user") || "{}");
    } catch { return {}; }
  };
  const userId = getUser()?.id;

  useEffect(() => {
    if (userId) fetchDoctorSettings();
  }, [userId]);

  useEffect(() => {
    if (!whatsappPhone && !userId) return;
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 10000);
    return () => clearInterval(interval);
  }, [whatsappPhone, userId]);

  const fetchDoctorSettings = async () => {
    try {
      const res = await fetch(`/api/doctor-settings?userId=${userId || "default"}`);
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        const start = d.start_time || "09:00";
        const end = d.end_time || "17:00";
        setDoctorForm(prev => ({
          ...prev,
          ...d,
          clinic_name: d.clinic_name || "",
          consultation_fee: d.consultation_fee || "",
          slot_duration_mins: d.slot_duration_mins || 30,
          timings: d.timings || `${start} - ${end}`,
          custom_rules: d.custom_rules || "",
          location: d.location || "",
        }));
        if (d.whatsapp_number) setWhatsappPhone(d.whatsapp_number);
      }
    } catch (err) {
      console.error("Failed to load doctor settings", err);
    }
  };

  const checkWhatsAppStatus = async () => {
    if (!whatsappPhone || !userId) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const phoneParam = whatsappPhone ? `phone=${encodeURIComponent(whatsappPhone)}&` : "";
      const userParam = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/integrations/whatsapp/status?${phoneParam}${userParam}`, { signal: controller.signal });
      const data = await res.json();
      setIsWhatsAppConnected(!!data.connected);
      if (data.phone && !whatsappPhone) setWhatsappPhone(data.phone);
    } catch (err: any) {
      if (err?.name !== "AbortError") setIsWhatsAppConnected(false);
    } finally {
      checkingRef.current = false;
      clearTimeout(timeout);
    }
  };

  const handleSaveSettings = async () => {
    setLoading("settings");
    const t = toast.loading("Saving clinic settings...");
    try {
      const payload = { ...doctorForm, user_id: userId, whatsapp_number: whatsappPhone };
      const res = await fetch("/api/doctor-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) toast.success("Clinic info updated!", { id: t });
      else throw new Error(result.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", { id: t });
    } finally {
      setLoading(null);
    }
  };

  const generatePairingCode = async () => {
    if (!connectPhone) return toast.error("Please enter a phone number");
    setLoading("whatsapp_code");
    const t = toast.loading("Generating pairing code...");
    try {
      const clean = connectPhone.replace(/\D/g, "");
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: clean, userId, businessType: "clinic" }),
      });
      const result = await res.json();
      if (result.success) {
        setPairingCode(result.pairingCode);
        toast.success("Code generated! Enter it in WhatsApp.", { id: t });
        setWhatsappPhone(connectPhone);
        await fetch("/api/doctor-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...doctorForm, user_id: userId, whatsapp_number: connectPhone }),
        });
      } else throw new Error(result.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to connect", { id: t });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/20 italic">Medical SaaS Hub</span>
          <h2 className="text-4xl font-black mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic tracking-tight uppercase mt-2">
            Clinic Dashboard
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowConnectModal(true); setPairingCode(null); setConnectPhone(whatsappPhone || ""); }}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-lg hover:scale-105 active:scale-95 ${
              isWhatsAppConnected
                ? "bg-green-600 text-white shadow-green-900/30"
                : "bg-primary text-white"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isWhatsAppConnected ? 'bg-green-300 animate-pulse' : 'bg-white/60'}`}></div>
            {isWhatsAppConnected ? "Connected" : "Connect WhatsApp"}
          </button>
        </div>
      </div>

      {/* Connect WhatsApp Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowConnectModal(false)}></div>
          <div className="bg-card border border-border w-full max-w-xl rounded-[40px] relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black italic tracking-tight">Connect WhatsApp</h3>
                  <p className="text-text-secondary text-sm font-medium">Link your clinic's WhatsApp number.</p>
                </div>
                <button onClick={() => setShowConnectModal(false)} className="p-3 bg-background border border-border rounded-2xl hover:border-red-500/50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-8">
                {isWhatsAppConnected ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-8 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-black text-white mb-1">WhatsApp Connected!</h4>
                    <p className="text-xs text-text-secondary mb-6 font-medium">Your AI Receptionist is now live and ready to take appointments.</p>
                    <button onClick={() => setShowConnectModal(false)} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">Done</button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Phone Number (with Country Code)</label>
                      <input type="text" placeholder="+92 305 1234567" className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-green-500" value={connectPhone} onChange={(e) => setConnectPhone(e.target.value)} />
                    </div>
                    {pairingCode ? (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8 text-center animate-in zoom-in-95">
                        <p className="text-[10px] font-black text-green-500 mb-4 uppercase tracking-widest">Your Pairing Code</p>
                        <div className="flex justify-center items-center gap-2">
                          {pairingCode.replace(/-/g, '').slice(0, 4).split('').map((char, i) => (
                            <span key={i} className="w-10 h-14 bg-background border border-green-500/30 rounded-xl flex items-center justify-center text-3xl font-black text-green-500 shadow-sm">{char}</span>
                          ))}
                          <span className="text-green-500/60 text-3xl font-black mx-1">-</span>
                          {pairingCode.replace(/-/g, '').slice(4, 8).split('').map((char, i) => (
                            <span key={i + 4} className="w-10 h-14 bg-background border border-green-500/30 rounded-xl flex items-center justify-center text-3xl font-black text-green-500 shadow-sm">{char}</span>
                          ))}
                        </div>
                        <p className="text-xs text-text-secondary mt-6 font-medium leading-relaxed">
                          Open WhatsApp on your phone → <strong>Linked Devices</strong> → <strong>Link with Phone Number</strong> → Enter this code.
                        </p>
                      </div>
                    ) : (
                      <button onClick={generatePairingCode} disabled={loading === "whatsapp_code"} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-green-900/30 transition-all disabled:opacity-50">
                        {loading === "whatsapp_code" ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                        Generate Connection Code
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connection Status + Live Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`bg-card border rounded-[32px] p-8 relative overflow-hidden transition-all shadow-sm ${isWhatsAppConnected ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mb-6 border ${isWhatsAppConnected ? 'bg-green-500/20 border-green-500/30 text-green-500' : 'bg-red-500/20 border-red-500/30 text-red-500'}`}>
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <p className="text-3xl font-black mb-1 tracking-tighter text-white">
              {isWhatsAppConnected ? "Connected" : "Disconnected"}
            </p>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] mb-3">WhatsApp Engine</p>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isWhatsAppConnected ? 'text-green-500' : 'text-red-500'}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${isWhatsAppConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isWhatsAppConnected ? "Live and Routing" : "Action Required"}
            </div>
          </div>
        </div>

        <LiveClock />
      </div>

      {/* Settings Card */}
      <div className="bg-card border border-border rounded-3xl p-8 min-h-[500px]">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black italic">Clinic Profile</h3>
            <button
              onClick={handleSaveSettings}
              disabled={loading === "settings"}
              className="px-6 py-3 bg-white text-black rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {loading === "settings" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Clinic Name</label>
              <input
                value={doctorForm.clinic_name}
                onChange={e => setDoctorForm({ ...doctorForm, clinic_name: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-primary"
                placeholder="e.g. City Care Hospital"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Consultation Fee</label>
              <div className="relative">
                <Banknote className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  value={doctorForm.consultation_fee}
                  onChange={e => setDoctorForm({ ...doctorForm, consultation_fee: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 pl-11 text-sm font-bold outline-none focus:border-primary"
                  placeholder="e.g. Rs. 1000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Timings</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  value={doctorForm.timings}
                  onChange={e => setDoctorForm({ ...doctorForm, timings: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 pl-11 text-sm font-bold outline-none focus:border-primary"
                  placeholder="e.g. 9 AM - 5 PM"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Slot Duration (Mins)</label>
              <input
                type="number"
                value={doctorForm.slot_duration_mins}
                onChange={e => setDoctorForm({ ...doctorForm, slot_duration_mins: parseInt(e.target.value) })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-primary"
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  value={doctorForm.location}
                  onChange={e => setDoctorForm({ ...doctorForm, location: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 pl-11 text-sm font-bold outline-none focus:border-primary"
                  placeholder="e.g. Main Bazaar, Karachi"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">WhatsApp Number</label>
              <input
                value={whatsappPhone}
                readOnly
                className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none text-text-secondary"
                placeholder="Connect via button above"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  Agent Instructions & Rules
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (doctorForm.custom_rules && !confirm("Replace current instructions with the clinic template?")) {
                      return;
                    }
                    setDoctorForm(prev => ({ ...prev, custom_rules: CLINIC_RULES_TEMPLATE }));
                    toast.success("Clinic template loaded! Edit the values inside inverted commas (\"...\")");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Use Template
                </button>
              </div>
              <p className="text-xs text-text-secondary">
                Tip: Customize the details inside inverted commas <span className="text-primary font-mono font-bold">"..."</span> to match your clinic.
              </p>
              <textarea
                rows={8}
                value={doctorForm.custom_rules}
                onChange={e => setDoctorForm({ ...doctorForm, custom_rules: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-primary resize-none leading-relaxed font-mono"
                placeholder={CLINIC_RULES_TEMPLATE}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
