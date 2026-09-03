"use client";

import { Save, AlertTriangle, Building2, Phone, Mail } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useBusiness } from "../../context/BusinessContext";

export default function SettingsPage() {
  const { data, updateData } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: data.name,
    phone: data.phone,
    email: (data as any).email || "admin@company.com"
  });

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return phone.replace(/\D/g, "").length >= 7;
  };

  const handleSave = () => {
    if (!formData.name) return toast.error("Business name is required");
    if (!validateEmail(formData.email)) return toast.error("Invalid email address");
    if (!validatePhone(formData.phone)) return toast.error("Invalid phone number");

    setLoading(true);
    updateData({
      name: formData.name,
      phone: formData.phone,
      ...(formData.email ? { email: formData.email } : {})
    } as any);

    setTimeout(() => {
      setLoading(false);
      toast.success("Professional settings saved successfully!");
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">Control Panel</h2>
          <p className="text-text-secondary font-medium">Manage your professional business profile and AI identity.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-8 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/10 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {loading ? "Syncing..." : "Apply Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16"></div>
            
            <div>
              <h3 className="font-black text-xl mb-6 tracking-tight">Business Profile</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Legal Name / Person Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary transition-all font-bold text-sm" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Contact Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary transition-all font-bold text-sm" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Support Hotline</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary transition-all font-bold text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 space-y-4">
            <h3 className="font-black text-xl text-red-500 uppercase tracking-tight">Danger Zone</h3>
            <p className="text-sm text-text-secondary font-medium leading-relaxed">Once you delete your account or purge data, there is no going back. All AI training and integrations will be lost.</p>
            <button className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
              Purge My Account
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 space-y-6">
            <h3 className="font-black text-xl tracking-tight">Billing</h3>
            <div className="p-5 bg-background border border-border rounded-2xl border-l-4 border-l-primary">
              <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Current Plan</div>
              <div className="text-xl font-black mb-2">Professional Starter</div>
              <div className="text-xs text-text-secondary font-medium leading-relaxed">Free for beta users. Includes unlimited WhatsApp pairing and AI Crawling.</div>
            </div>
            <button className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              Upgrade to Pro
            </button>
          </div>
          
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-3xl p-6 flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
             <p className="text-[10px] text-yellow-500/80 leading-relaxed font-medium">
               Professional accounts require a valid phone number for WhatsApp synchronization.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

