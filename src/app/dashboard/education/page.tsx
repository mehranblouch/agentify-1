"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Settings, Users, CalendarCheck, Send, Loader2, Save, Plus, Trash2, Check, X, Bell, MessageSquare, Sparkles
} from "lucide-react";

const EDUCATION_RULES_TEMPLATE = `- School Name: "Al-Hadi Grammar School"
- Address: "Street 12, Model Town, Lahore"
- Timings: "Monday to Friday: 8:00 AM - 2:00 PM (Saturday: 8:00 AM - 12:00 PM)"
- Contact / Office Phone: "042-1234567" (WhatsApp: "+92 300 1234567")
- Environment & Sanitation: "Clean and hygienic campus, well-maintained washrooms, safe and secure premises"
- Staff: "Principal: Prof. Muhammad Usman. Senior teachers available for Grade 1 to Grade 10."
- Transport: "School van pick-and-drop available on routes covering Model Town, Gulberg, and Iqbal Town"
- Facilities: "Air-conditioned classrooms, science lab, computer lab, library, playground, canteen"
- Social Media: Facebook: "facebook.com/yourinstitute", Instagram: "instagram.com/yourinstitute"
- Admissions Policy: "Admissions open for 'Grade 1 to Grade 10'. Entrance assessment and parent interview required."
- Monthly Fee Structure: "Tuition fee 'Rs. 5,000 per month'. Due date '10th of every month'. Late fee 'Rs. 200'."
- Student Leave & Absence: "Parents must notify absence on WhatsApp before '8:30 AM' stating student name, class, and reason."
- Parent-Teacher Meetings: "Meetings scheduled for 'Saturdays between 9:00 AM - 12:00 PM' with 24 hours prior notice."
- Uniform & Discipline Code: "Complete school uniform is mandatory. Mobile phones and unauthorized items are strictly banned."
- Communication Tone: "Respectful, encouraging, professional, and supportive with all parents and guardians."`;

type EducationSettings = {
  institute_name: string;
  address: string;
  timings: string;
  info_box: string;
  whatsapp_number: string;
};

type Student = {
  id: string;
  name: string;
  father_name: string;
  phone: string;
};

export default function EducationDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam && ["settings", "students", "attendance", "broadcast"].includes(tabParam) ? tabParam : "settings");
  const [loading, setLoading] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState<EducationSettings>({
    institute_name: "", address: "", timings: "", info_box: "", whatsapp_number: ""
  });

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", father_name: "", phone: "" });

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState<{[studentId: string]: {status: string, notified: boolean}}>({});

  // WhatsApp
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [connectPhone, setConnectPhone] = useState("");

  // Broadcast
  const [broadcastMessage, setBroadcastMessage] = useState("");

  useEffect(() => {
    if (tabParam && ["settings", "students", "attendance", "broadcast"].includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/dashboard/education?tab=${tab}`);
  };

  // Get user ID
  const getUser = () => {
    try {
      return JSON.parse(sessionStorage.getItem("agentify_current_user") || "{}");
    } catch { return {}; }
  };
  const userId = getUser()?.id;

  useEffect(() => {
    if (userId) {
      loadSettings();
      loadStudents();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && activeTab === "attendance") {
      loadAttendance();
    }
  }, [userId, activeTab, attendanceDate]);

  useEffect(() => {
    if (settings.whatsapp_number) {
      checkWhatsAppStatus();
      const interval = setInterval(checkWhatsAppStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [settings.whatsapp_number]);

  // --- API Calls ---

  const loadSettings = async () => {
    const res = await fetch(`/api/education/settings?userId=${userId}`);
    const data = await res.json();
    if (data.success && data.data) setSettings(data.data);
  };

  const saveSettings = async () => {
    setLoading("settings");
    const t = toast.loading("Saving settings...");
    try {
      await fetch("/api/education/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, user_id: userId })
      });
      toast.success("Settings saved", { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setLoading(null);
  };

  const loadStudents = async () => {
    const res = await fetch(`/api/education/students?userId=${userId}`);
    const data = await res.json();
    if (data.success) setStudents(data.data);
  };

  const addStudent = async () => {
    if (!newStudent.name || !newStudent.phone) return toast.error("Name and phone required");
    setLoading("add_student");
    try {
      await fetch("/api/education/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newStudent, user_id: userId })
      });
      setNewStudent({ name: "", father_name: "", phone: "" });
      await loadStudents();
      toast.success("Student added");
    } catch (e: any) { toast.error(e.message); }
    setLoading(null);
  };

  const deleteStudent = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/education/students?userId=${userId}&id=${id}`, { method: "DELETE" });
      await loadStudents();
    } catch (e: any) { toast.error(e.message); }
  };

  const loadAttendance = async () => {
    const res = await fetch(`/api/education/attendance?userId=${userId}&date=${attendanceDate}`);
    const data = await res.json();
    if (data.success) {
      const map: any = {};
      data.data.forEach((log: any) => {
        map[log.student_id] = { status: log.status, notified: log.notified };
      });
      setAttendanceMap(map);
    }
  };

  const markAttendance = async (studentId: string, status: string) => {
    try {
      // Optimistic update
      setAttendanceMap(prev => ({...prev, [studentId]: { status, notified: false }}));
      await fetch("/api/education/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, student_id: studentId, date: attendanceDate, status })
      });
    } catch (e: any) { toast.error(e.message); }
  };

  const sendAbsentNotices = async () => {
    if (!confirm(`Send absentee messages via WhatsApp for ${attendanceDate}?`)) return;
    setLoading("notices");
    const t = toast.loading("Dispatching WhatsApp messages...");
    try {
      const res = await fetch("/api/education/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "absent", date: attendanceDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Sent ${data.sentCount} notices`, { id: t });
      loadAttendance();
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setLoading(null);
  };

  const checkWhatsAppStatus = async () => {
    if (!settings.whatsapp_number || !userId) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `/api/integrations/whatsapp/status?phone=${encodeURIComponent(settings.whatsapp_number)}&userId=${encodeURIComponent(userId)}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      setIsWhatsAppConnected(data.connected);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Silently fail — server may be restarting, don't flood console
        setIsWhatsAppConnected(false);
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  const generatePairingCode = async () => {
    if (!connectPhone) return toast.error("Enter a phone number");
    setLoading("whatsapp_code");
    const t = toast.loading("Generating pairing code...");
    try {
      const clean = connectPhone.replace(/\D/g, "");
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: clean, userId, businessType: "education" })
      });
      const data = await res.json();
      if (data.success) {
        setPairingCode(data.pairingCode);
        toast.success("Code generated! Enter it in WhatsApp.", { id: t });
        setSettings(prev => ({ ...prev, whatsapp_number: connectPhone }));
        // Directly save the updated payload to avoid React stale state
        await fetch("/api/education/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...settings, user_id: userId, whatsapp_number: connectPhone })
        });
      } else throw new Error(data.error);
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setLoading(null);
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage) return toast.error("Write a message first");
    if (!confirm("Send to ALL students?")) return;
    setLoading("broadcast");
    const t = toast.loading("Broadcasting...");
    try {
      const res = await fetch("/api/education/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "broadcast", message: broadcastMessage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Sent broadcast to ${data.sentCount} numbers`, { id: t });
      setBroadcastMessage("");
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setLoading(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-20">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-wider border border-blue-500/20 italic">Education Hub</span>
          <h2 className="text-4xl font-black mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic tracking-tight uppercase mt-2">
            School Dashboard
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowConnectModal(true); setPairingCode(null); setConnectPhone(settings.whatsapp_number || ""); }}
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

      {/* Mobile current section indicator */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm font-bold text-text-secondary">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {["settings", "students", "attendance", "broadcast"].find(t => t === activeTab) === "settings" && "School Settings"}
        {activeTab === "students" && "Students"}
        {activeTab === "attendance" && "Attendance"}
        {activeTab === "broadcast" && "Broadcast"}
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
                  <p className="text-text-secondary text-sm font-medium">Link your school's WhatsApp number.</p>
                </div>
                <button onClick={() => setShowConnectModal(false)} className="p-3 bg-background border border-border rounded-2xl hover:border-red-500/50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Phone Number (with Country Code)</label>
                  <input 
                    type="text" 
                    placeholder="+92 305 1234567"
                    className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-green-500"
                    value={connectPhone}
                    onChange={(e) => setConnectPhone(e.target.value)}
                  />
                </div>

                {pairingCode ? (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8 text-center animate-in zoom-in-95">
                    <p className="text-[10px] font-black text-green-500 mb-4 uppercase tracking-widest">Your Pairing Code</p>
                    <div className="flex justify-center items-center gap-2">
                      {pairingCode.replace(/-/g, '').slice(0, 4).split('').map((char, i) => (
                        <span key={i} className="w-10 h-14 bg-background border border-green-500/30 rounded-xl flex items-center justify-center text-3xl font-black text-green-500 shadow-sm">
                          {char}
                        </span>
                      ))}
                      <span className="text-green-500/60 text-3xl font-black mx-1">-</span>
                      {pairingCode.replace(/-/g, '').slice(4, 8).split('').map((char, i) => (
                        <span key={i + 4} className="w-10 h-14 bg-background border border-green-500/30 rounded-xl flex items-center justify-center text-3xl font-black text-green-500 shadow-sm">
                          {char}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary mt-6 font-medium leading-relaxed">
                      Open WhatsApp on your phone → Linked Devices → Link with Phone Number → Enter this code.
                    </p>
                  </div>
                ) : (
                  <button 
                    onClick={generatePairingCode}
                    disabled={loading === "whatsapp_code"}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-green-900/30 transition-all disabled:opacity-50"
                  >
                    {loading === "whatsapp_code" ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                    Generate Connection Code
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connection Status */}
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

      <div className="hidden md:flex bg-card border border-border p-1 rounded-2xl gap-1 overflow-x-auto overflow-y-hidden">
        {[
          { id: "settings", icon: Settings, label: "Settings & AI Info" },
          { id: "students", icon: Users, label: "Students" },
          { id: "attendance", icon: CalendarCheck, label: "Attendance" },
          { id: "broadcast", icon: Send, label: "Broadcast" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-primary text-white shadow-lg" : "text-text-secondary hover:bg-background"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-3xl p-8 min-h-[500px]">
        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic">School Profile</h3>
              <button 
                onClick={saveSettings}
                disabled={loading === "settings"}
                className="px-6 py-3 bg-white text-black rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50"
              >
                {loading === "settings" ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Institute Name</label>
                <input 
                  value={settings.institute_name} onChange={e => setSettings({...settings, institute_name: e.target.value})}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">WhatsApp Number</label>
                <input 
                  value={settings.whatsapp_number} onChange={e => setSettings({...settings, whatsapp_number: e.target.value})}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Address</label>
                <input 
                  value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Timings</label>
                <input 
                  value={settings.timings} onChange={e => setSettings({...settings, timings: e.target.value})}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                    AI Instructions & Policies Box
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (settings.info_box && !confirm("Replace current instructions with the school template?")) {
                        return;
                      }
                      setSettings(prev => ({ ...prev, info_box: EDUCATION_RULES_TEMPLATE }));
                      toast.success("School template loaded! Edit the values inside inverted commas (\"...\")");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Use Template
                  </button>
                </div>
                <p className="text-xs text-text-secondary">
                  Tip: Customize the details inside inverted commas <span className="text-primary font-mono font-bold">"..."</span> to match your school/institute.
                </p>
                <textarea 
                  rows={8}
                  value={settings.info_box} 
                  onChange={e => setSettings({...settings, info_box: e.target.value})}
                  placeholder={EDUCATION_RULES_TEMPLATE}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-primary resize-none leading-relaxed font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black italic">Student Database</h3>
            
            <div className="bg-background border border-border p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Student Name</label>
                <input value={newStudent.name} onChange={e=>setNewStudent({...newStudent, name:e.target.value})} className="w-full border border-border bg-card rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-bold"/>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Father's Name</label>
                <input value={newStudent.father_name} onChange={e=>setNewStudent({...newStudent, father_name:e.target.value})} className="w-full border border-border bg-card rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-bold"/>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Parent's WhatsApp</label>
                <input value={newStudent.phone} onChange={e=>setNewStudent({...newStudent, phone:e.target.value})} placeholder="+92..." className="w-full border border-border bg-card rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-bold"/>
              </div>
              <button onClick={addStudent} disabled={loading === "add_student"} className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2">
                <Plus className="w-4 h-4"/> Add
              </button>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-background border-b border-border text-[10px] uppercase tracking-widest text-text-secondary">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Father</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm font-medium">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-background/50">
                      <td className="p-4">{s.name}</td>
                      <td className="p-4">{s.father_name}</td>
                      <td className="p-4 font-mono">{s.phone}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => deleteStudent(s.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-text-secondary">No students added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <h3 className="text-2xl font-black italic">Daily Attendance</h3>
                <p className="text-text-secondary text-sm">Mark students and dispatch alerts.</p>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="date" 
                  value={attendanceDate} 
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="bg-background border border-border px-4 py-2 rounded-xl text-sm font-bold outline-none"
                />
                <button 
                  onClick={sendAbsentNotices}
                  disabled={loading === "notices"}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                  <Bell className="w-4 h-4" /> Send Alerts
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {students.map(s => {
                const status = attendanceMap[s.id]?.status;
                const notified = attendanceMap[s.id]?.notified;
                return (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                    <div>
                      <div className="font-bold">{s.name}</div>
                      <div className="text-xs text-text-secondary">{s.father_name} • {s.phone}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {notified && <span className="text-[10px] uppercase font-black text-green-500 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">Notified</span>}
                      <div className="flex bg-card border border-border rounded-lg overflow-hidden">
                        <button 
                          onClick={() => markAttendance(s.id, "present")}
                          className={`px-4 py-2 text-xs font-bold transition-all ${status === "present" ? "bg-green-500 text-white" : "hover:bg-background"}`}
                        >
                          Present
                        </button>
                        <button 
                          onClick={() => markAttendance(s.id, "absent")}
                          className={`px-4 py-2 text-xs font-bold transition-all ${status === "absent" ? "bg-red-500 text-white" : "hover:bg-background"}`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && <p className="text-center p-8 text-text-secondary">Add students first.</p>}
            </div>
          </div>
        )}

        {/* BROADCAST TAB */}
        {activeTab === "broadcast" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black italic">Broadcast Announcement</h3>
            <p className="text-text-secondary">Send a message to all {students.length} registered phone numbers.</p>
            
            <textarea 
              rows={8}
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="e.g. Tomorrow is a public holiday..."
              className="w-full bg-background border border-border rounded-2xl p-6 text-sm font-bold outline-none focus:border-primary resize-none"
            />
            
            <div className="flex justify-end">
              <button 
                onClick={sendBroadcast}
                disabled={loading === "broadcast" || students.length === 0}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5"/> Send to All
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
