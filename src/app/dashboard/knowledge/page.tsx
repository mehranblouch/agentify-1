"use client";

import { Globe, Search, Plus, Trash2, RefreshCw, Loader2, Database, FileText, CheckCircle2, AlertCircle, Terminal, Clock, Bell, Zap, BookOpen } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { safeFetch } from "@/lib/safe-fetch";

interface KnowledgeSource {
  id: string;
  type: 'website' | 'file' | 'sheet';
  title: string;
  url?: string;
  content: string;
  status: 'synced' | 'syncing' | 'error';
  lastUpdated: string;
}

const COMMAND_EXAMPLES = [
  { icon: "🏫", label: "School — Attendance Alert", text: "Every day at 9:00 AM, check the Attendance sheet. Find all rows where Status = Absent. Send a WhatsApp message to each student's phone: \"Dear {name}, you were absent today. Please contact the school.\"" },
  { icon: "🏥", label: "Clinic — Appointment Booking", text: "When a customer asks to book an appointment, collect their Name, Phone Number, and Preferred Date. Save it to the Google Sheet. Reply: \"Thank you {name}, your appointment is confirmed for {date}.\"" },
  { icon: "🛍️", label: "E-commerce — Order Updates", text: "When a customer mentions their order number, find it in the Orders sheet and reply with the current Status from the Status column." },
  { icon: "🚗", label: "Delivery — Status Alerts", text: "When the Delivery sheet is updated and Status changes to Shipped, send a WhatsApp to the CustomerPhone: \"Hi {name}, your order is on the way! Estimated delivery: {date}.\"" },
];

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<"knowledge" | "commands">("knowledge");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [knowledgeText, setKnowledgeText] = useState("");
  const [commandText, setCommandText] = useState("");
  const [sources, setSources] = useState<KnowledgeSource[]>([
    {
      id: "1",
      type: "sheet",
      title: "Business Data Sheet",
      url: "https://docs.google.com/spreadsheets/...",
      content: "Products, services, pricing, and availability.",
      status: "synced",
      lastUpdated: "2 hours ago"
    }
  ]);

  const handleCrawl = async () => {
    if (!url) return toast.error("Please enter a URL");
    setLoading(true);
    const loadingToast = toast.loading("Crawling website content...");
    try {
      const data = await safeFetch<any>("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (data.success) {
        setSources(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          type: "website",
          title: data.metadata.title || new URL(url).hostname,
          url,
          content: data.content.substring(0, 200) + "...",
          status: "synced",
          lastUpdated: "Just now"
        }, ...prev]);
        setUrl("");
        toast.success("Website crawled!", { id: loadingToast });
      } else {
        toast.error(data.error || "Failed to crawl", { id: loadingToast });
      }
    } catch {
      toast.error("Network error.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const key = activeTab === "knowledge" ? "business_knowledge" : "business_commands";
    const value = activeTab === "knowledge" ? knowledgeText : commandText;
    sessionStorage.setItem(key, value);
    toast.success(activeTab === "knowledge" ? "Knowledge saved!" : "Commands saved & active!");
  };

  const deleteSource = (id: string) => {
    setSources(s => s.filter(x => x.id !== id));
    toast.success("Source removed.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">AI Configuration</span>
          </div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">Agent Brain</h2>
          <p className="text-text-secondary text-sm font-medium">Define what your AI <span className="text-white font-bold">knows</span> and what it <span className="text-white font-bold">does</span>.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === "knowledge" ? "bg-white text-black shadow-lg" : "text-text-secondary hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          📚 Knowledge Box
        </button>
        <button
          onClick={() => setActiveTab("commands")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === "commands" ? "bg-white text-black shadow-lg" : "text-text-secondary hover:text-white"
          }`}
        >
          <Terminal className="w-4 h-4" />
          ⚡ Command Box
        </button>
      </div>

      {/* KNOWLEDGE TAB */}
      {activeTab === "knowledge" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Manual Knowledge Box */}
          <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-xl">Business Knowledge</h3>
                  <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">What your AI knows about your business</p>
                </div>
              </div>
              <textarea
                placeholder={`Write anything your AI should know:\n\nOur clinic is open Monday to Saturday, 9 AM to 6 PM.\nDr. Ahmed specializes in General Medicine.\nConsultation fee is Rs. 800.\nWe are located in Gulshan-e-Iqbal, Karachi.`}
                value={knowledgeText}
                onChange={e => setKnowledgeText(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl p-6 text-sm font-medium outline-none focus:border-primary transition-all min-h-[200px] resize-y leading-relaxed"
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-text-secondary italic">This information is injected into the AI's memory. It will use it to answer customer questions.</p>
                <button onClick={handleSave} className="px-6 py-2.5 bg-white text-black rounded-xl text-xs font-black hover:bg-white/90 transition-all shadow-lg shadow-white/10">
                  Save Knowledge
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Crawler */}
          <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-black text-xl">Auto-Crawler</h3>
                  <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Add website data instantly</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/50" />
                  <input
                    type="url"
                    placeholder="https://yourbusiness.com/about"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary transition-all font-medium text-sm"
                  />
                </div>
                <button
                  onClick={handleCrawl}
                  disabled={loading}
                  className="px-8 py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all flex items-center gap-2 shadow-xl disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Crawl & Learn
                </button>
              </div>
            </div>
          </div>

          {/* Sources Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Connected Sources</h3>
              <span className="text-[10px] font-bold bg-border px-2 py-0.5 rounded-full">{sources.length} Active</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map(source => (
                <div key={source.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-xl border ${source.type === 'website' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : source.type === 'sheet' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                      {source.type === 'website' ? <Globe className="w-5 h-5" /> : source.type === 'sheet' ? <Database className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <button onClick={() => deleteSource(source.id)} className="p-2 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-bold text-sm mb-1 truncate">{source.title}</h4>
                  <p className="text-[10px] text-text-secondary line-clamp-2 mb-4 leading-relaxed font-medium">{source.content}</p>
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${source.status === 'synced' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">{source.status}</span>
                    </div>
                    <span className="text-[9px] font-bold text-text-secondary/50 italic">{source.lastUpdated}</span>
                  </div>
                </div>
              ))}
              <button className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all bg-background/20 group">
                <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center group-hover:bg-primary/10">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Add Source</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMANDS TAB */}
      {activeTab === "commands" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Info Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Clock, label: "Scheduled", desc: "\"Every day at 9 AM, send...\"", color: "text-orange-500", bg: "bg-orange-500/10" },
              { icon: Bell, label: "On Trigger", desc: "\"When sheet is updated...\"", color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: Zap, label: "On Message", desc: "\"When customer asks X, do Y\"", color: "text-green-500", bg: "bg-green-500/10" },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-3">
                <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center border border-border shrink-0`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs font-black">{item.label}</p>
                  <p className="text-[10px] text-text-secondary font-medium italic mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Command Text Box */}
          <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                    <Terminal className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl">Your Commands</h3>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Write in plain English — AI will follow them</p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">Active on Save</span>
              </div>

              <textarea
                placeholder={`Examples of what you can write:\n\nEvery day at 9:00 AM, check the Attendance sheet. Find all students where Status = Absent. Send a WhatsApp to each one: "Dear {name}, you were absent today. Call 0300-123."\n\nWhen a customer asks to book an appointment, collect their Name, Phone, and Preferred Date. Save it to the Google Sheet. Confirm with: "Thank you {name}, see you on {date}."\n\nWhen a customer mentions an order number, look it up in the Orders sheet and reply with their order status.`}
                value={commandText}
                onChange={e => setCommandText(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl p-6 text-sm font-medium outline-none focus:border-orange-500 transition-all min-h-[250px] resize-y leading-relaxed"
              />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] text-text-secondary font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  Variables: <span className="text-primary font-black">{"{name}"} {"{phone}"} {"{date}"} {"{status}"}</span>
                </div>
                <button onClick={handleSave} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-orange-900/20">
                  Activate Commands
                </button>
              </div>
            </div>
          </div>

          {/* Example Templates */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Command Templates — Click to Copy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMMAND_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setCommandText(ex.text); toast.success(`${ex.label} template loaded!`); }}
                  className="bg-card border border-border rounded-2xl p-5 text-left hover:border-orange-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{ex.icon}</span>
                    <p className="text-xs font-black uppercase tracking-wider">{ex.label}</p>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-3 font-medium italic group-hover:text-white transition-colors">
                    "{ex.text}"
                  </p>
                  <div className="mt-3 text-[9px] font-black text-orange-500 uppercase tracking-wider">
                    Click to use →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Note */}
      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <AlertCircle className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[10px] text-text-secondary font-medium leading-relaxed max-w-md">
            <span className="text-white font-black">Knowledge Box</span> = what your AI knows. &nbsp;
            <span className="text-white font-black">Command Box</span> = what your AI does.
          </p>
        </div>
        <button className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0">
          Sync AI Brain
        </button>
      </div>
    </div>
  );
}
