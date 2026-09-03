"use client";

import { useState } from "react";
import { Zap, Plus, Play, Trash2, CheckCircle2, AlertCircle, Loader2, MessageSquare, Calendar, Database, Clock, ChevronDown, ChevronUp, Settings } from "lucide-react";
import toast from "react-hot-toast";

interface WorkflowRule {
  id: string;
  name: string;
  trigger: "manual" | "schedule" | "on_message";
  schedule?: string;
  sheetUrl: string;
  conditionColumn: string;
  conditionValue: string;
  phoneColumn: string;
  nameColumn: string;
  messageTemplate: string;
  actionType: "whatsapp_bulk" | "save_record" | "sheet_lookup";
  status: "idle" | "running" | "done" | "error";
  lastRun?: string;
  totalSent?: number;
}

const TEMPLATES = {
  school: {
    name: "Attendance Alert (School)",
    conditionColumn: "Status",
    conditionValue: "Absent",
    phoneColumn: "Phone",
    nameColumn: "Name",
    messageTemplate: "Dear {name}, you were marked absent today. Please contact the school office at your earliest convenience.",
    actionType: "whatsapp_bulk" as const,
    trigger: "manual" as const,
  },
  doctor: {
    name: "Appointment Reminder (Clinic)",
    conditionColumn: "AppointmentDate",
    conditionValue: "Tomorrow",
    phoneColumn: "PatientPhone",
    nameColumn: "PatientName",
    messageTemplate: "Dear {name}, this is a reminder for your appointment tomorrow. Please arrive 10 minutes early. Reply CONFIRM to confirm.",
    actionType: "whatsapp_bulk" as const,
    trigger: "manual" as const,
  },
  ecommerce: {
    name: "Order Status Lookup (E-commerce)",
    conditionColumn: "OrderStatus",
    conditionValue: "Shipped",
    phoneColumn: "CustomerPhone",
    nameColumn: "CustomerName",
    messageTemplate: "Hi {name}! Your order has been shipped and is on its way. Track it at our website.",
    actionType: "whatsapp_bulk" as const,
    trigger: "manual" as const,
  },
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([
    {
      id: "demo1",
      name: "Absent Student Alert",
      trigger: "manual",
      sheetUrl: "",
      conditionColumn: "Status",
      conditionValue: "Absent",
      phoneColumn: "Phone",
      nameColumn: "Name",
      messageTemplate: "Dear Parent, your child {name} (Class {class}) is absent today. Please inform the school regarding the reason.",
      actionType: "whatsapp_bulk",
      status: "idle",
    }
  ]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>("demo1");
  const [form, setForm] = useState({
    name: "",
    trigger: "manual" as const,
    sheetUrl: "",
    conditionColumn: "",
    conditionValue: "",
    phoneColumn: "",
    nameColumn: "",
    messageTemplate: "",
    actionType: "whatsapp_bulk" as const,
  });

  const applyTemplate = (key: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[key];
    setForm(f => ({ ...f, ...t }));
    toast.success(`${t.name} template applied!`);
  };

  const addWorkflow = () => {
    if (!form.name || !form.messageTemplate) {
      return toast.error("Please fill the Workflow Name and Message Template.");
    }
    const newRule: WorkflowRule = {
      id: Math.random().toString(36).substr(2, 9),
      ...form,
      status: "idle",
    };
    setWorkflows([newRule, ...workflows]);
    setShowForm(false);
    setForm({ name: "", trigger: "manual", sheetUrl: "", conditionColumn: "", conditionValue: "", phoneColumn: "", nameColumn: "", messageTemplate: "", actionType: "whatsapp_bulk" });
    toast.success("Workflow created!");
  };

  const runWorkflow = async (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;

    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: "running" } : w));
    const loadingToast = toast.loading(`Running: ${wf.name}...`);

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl: wf.sheetUrl,
          conditionColumn: wf.conditionColumn,
          conditionValue: wf.conditionValue,
          phoneColumn: wf.phoneColumn,
          nameColumn: wf.nameColumn,
          messageTemplate: wf.messageTemplate,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        const data = text.startsWith('{') ? JSON.parse(text) : { error: `Server error: ${res.status}` };
        throw new Error(data.error || text);
      }

      const data = await res.json();

      if (data.success) {
        setWorkflows(prev => prev.map(w => w.id === id ? {
          ...w, status: "done", lastRun: "Just now", totalSent: data.sent
        } : w));
        toast.success(`✅ Sent to ${data.sent} contacts!`, { id: loadingToast });
      } else {
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: "error" } : w));
        toast.error(data.error || "Workflow failed.", { id: loadingToast });
      }
    } catch (err) {
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: "error" } : w));
      toast.error("Network error.", { id: loadingToast });
    }
  };

  const deleteWorkflow = (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
    toast.success("Workflow removed.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">AI Automation</span>
          </div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">Workflow Engine</h2>
          <p className="text-text-secondary text-sm font-medium">Write rules in plain language. Your AI will execute them automatically.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-white text-black rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-white/90 transition-all shadow-xl shadow-white/10"
        >
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {/* How It Works Banner */}
      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Database, label: "1. Connect your Sheet", desc: "Paste your Google Sheet link with student/patient data" },
          { icon: Settings, label: "2. Write your rule", desc: "e.g. 'Send message to everyone where Status = Absent'" },
          { icon: Zap, label: "3. AI executes it", desc: "Agent reads the sheet, finds matches, sends WhatsApp" },
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
              <step.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black">{step.label}</p>
              <p className="text-[10px] text-text-secondary font-medium leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-3xl p-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl">Configure New Workflow</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Quick Templates:</span>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key as keyof typeof TEMPLATES)}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-black uppercase tracking-wider hover:border-primary/50 transition-all"
                >
                  {key === "school" ? "🏫 School" : key === "doctor" ? "🏥 Clinic" : "🛍️ Shop"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Workflow Name *</label>
              <input
                type="text"
                placeholder="e.g. Daily Attendance Alert"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Google Sheet URL</label>
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/..."
                value={form.sheetUrl}
                onChange={e => setForm({ ...form, sheetUrl: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Condition: Column Name</label>
              <input
                type="text"
                placeholder="e.g. Status / AppointmentDate"
                value={form.conditionColumn}
                onChange={e => setForm({ ...form, conditionColumn: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Condition: Value to match</label>
              <input
                type="text"
                placeholder="e.g. Absent / Shipped / Tomorrow"
                value={form.conditionValue}
                onChange={e => setForm({ ...form, conditionValue: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Phone Column Name</label>
              <input
                type="text"
                placeholder="e.g. Phone / ContactNumber"
                value={form.phoneColumn}
                onChange={e => setForm({ ...form, phoneColumn: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Name Column</label>
              <input
                type="text"
                placeholder="e.g. Name / StudentName / PatientName"
                value={form.nameColumn}
                onChange={e => setForm({ ...form, nameColumn: e.target.value })}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Message Template *</label>
              <span className="text-[10px] text-primary font-bold">Variables: {"{name}"} {"{phone}"} {"{date}"} {"{status}"}</span>
            </div>
            <textarea
              placeholder="Dear {name}, you were marked absent today. Please contact the school office."
              value={form.messageTemplate}
              onChange={e => setForm({ ...form, messageTemplate: e.target.value })}
              className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-primary transition-all min-h-[100px]"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={addWorkflow}
              className="px-8 py-3 bg-white text-black rounded-2xl text-sm font-black hover:bg-white/90 transition-all shadow-xl shadow-white/10"
            >
              Save Workflow
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-8 py-3 bg-background border border-border rounded-2xl text-sm font-bold hover:border-primary/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Workflow Cards */}
      <div className="space-y-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="bg-card border border-border rounded-3xl overflow-hidden transition-all hover:border-primary/30">
            {/* Card Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  wf.actionType === 'whatsapp_bulk' ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'
                }`}>
                  {wf.actionType === 'whatsapp_bulk' ? <MessageSquare className="w-6 h-6 text-green-500" /> : <Calendar className="w-6 h-6 text-blue-500" />}
                </div>
                <div>
                  <h4 className="font-black text-base">{wf.name}</h4>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                    When <span className="text-primary">{wf.conditionColumn}</span> = <span className="text-primary">"{wf.conditionValue}"</span> → Send WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {wf.status === "done" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] font-black text-green-500 uppercase">{wf.totalSent} sent</span>
                  </div>
                )}
                {wf.status === "error" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase">Failed</span>
                  </div>
                )}

                <button
                  onClick={() => runWorkflow(wf.id)}
                  disabled={wf.status === "running"}
                  className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-green-900/20 disabled:opacity-50"
                >
                  {wf.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {wf.status === "running" ? "Running..." : "Run Now"}
                </button>

                <button
                  onClick={() => setExpandedId(expandedId === wf.id ? null : wf.id)}
                  className="p-2 bg-background border border-border rounded-xl hover:border-primary/50 transition-all"
                >
                  {expandedId === wf.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => deleteWorkflow(wf.id)}
                  className="p-2 text-text-secondary hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === wf.id && (
              <div className="border-t border-border bg-background/30 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2">Sheet Source</p>
                  <p className="text-xs font-bold break-all">{wf.sheetUrl || <span className="text-text-secondary italic">No sheet linked</span>}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2">Condition</p>
                  <p className="text-xs font-bold">Column: <span className="text-primary">{wf.conditionColumn}</span> = <span className="text-primary">"{wf.conditionValue}"</span></p>
                  <p className="text-xs font-bold mt-1">Phone from: <span className="text-primary">{wf.phoneColumn}</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2">Message Template</p>
                  <p className="text-xs font-medium text-text-secondary italic leading-relaxed">"{wf.messageTemplate}"</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Education AI Section */}
      <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-black text-xl">Education AI (Student / Fees)</h3>
              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Conversational student support and fee management</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Instructions for AI Agent</p>
              <textarea
                defaultValue="When a parent asks for their child's fee status, check the Google Sheet using their Phone Number. If they ask about attendance, provide the last 5 days record. If they need to pay, provide the Bank Account details and ask for a receipt screenshot."
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-blue-500 transition-all min-h-[130px]"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Student & Fee Record (Google Sheet URL)</label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="w-full bg-background border border-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 text-[10px] text-blue-400 font-medium leading-relaxed">
                The AI will automatically look up student records and fee statuses during the conversation. You can also generate and send PDF fee vouchers directly via WhatsApp.
              </div>
              <button
                onClick={() => toast.success("Education AI activated!")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-900/20"
              >
                Activate Student Support AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
