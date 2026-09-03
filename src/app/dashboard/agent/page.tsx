"use client";

import { Save, Bot } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function AgentSettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Agent settings saved!");
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">My Agent</h2>
          <p className="text-text-secondary">Customize your AI agent's personality and behavior.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" /> Personality
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Agent Name</label>
            <input type="text" defaultValue="City Clinic Assistant" className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:border-primary" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Welcome Message</label>
            <textarea 
              rows={3} 
              defaultValue="Welcome to City Medical Clinic! How can I help you today? 😊" 
              className="w-full bg-background border border-border rounded-lg px-4 py-3 outline-none focus:border-primary resize-none" 
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Tone</label>
              <select defaultValue="friendly" className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:border-primary appearance-none">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Language</label>
              <select defaultValue="both" className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:border-primary appearance-none">
                <option value="english">English Only</option>
                <option value="urdu">Urdu Only</option>
                <option value="both">English & Urdu (Auto-detect)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
