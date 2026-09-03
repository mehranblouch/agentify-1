"use client";

import { useEffect, useState, useCallback } from "react";

type Business = {
  id: string;
  name: string;
  email: string;
  business_type: "clinic" | "education" | null;
  created_at: string;
  business_name: string;
  whatsapp_number: string | null;
  messages_incoming: number;
  messages_outgoing: number;
  paused: number;
  token_used: number;
};

type KeyUsage = {
  key_index: number;
  env_name: string;
  label: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  last_used: string | null;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [activeTab, setActiveTab] = useState<"businesses" | "keys">("businesses");
  const [clinics, setClinics] = useState<Business[]>([]);
  const [schools, setSchools] = useState<Business[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [keyUsage, setKeyUsage] = useState<KeyUsage[]>([]);
  const [resettingKey, setResettingKey] = useState<number | null>(null);
  const [togglingPause, setTogglingPause] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const loadKeyUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/groq-usage");
      const data = await res.json();
      if (data.success) setKeyUsage(data.keys);
    } catch {}
  }, []);

  const loadBusinesses = useCallback(async () => {
    const res = await fetch("/api/admin/businesses");
    const data = await res.json();
    if (!data.success) return;
    setClinics(data.businesses.filter((b: Business) => b.business_type === "clinic"));
    setSchools(data.businesses.filter((b: Business) => b.business_type === "education"));
  }, []);

  useEffect(() => {
    loadBusinesses();
    loadKeyUsage();
  }, [loadBusinesses, loadKeyUsage]);

  const handleResetKey = async (keyIndex: number) => {
    if (!confirm(`Reset usage counters for ${keyUsage[keyIndex]?.env_name || "this key"}?`)) return;
    setResettingKey(keyIndex);
    try {
      await fetch("/api/admin/groq-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyIndex }),
      });
      await loadKeyUsage();
    } catch {}
    setResettingKey(null);
  };

  const formatTokens = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  const handleRemove = async (b: Business) => {
    const label = b.business_name || b.name;
    if (!confirm(`Remove "${label}" and all their data? This cannot be undone.`)) return;
    setRemoving(b.id);
    try {
      const res = await fetch(`/api/admin/businesses?userId=${encodeURIComponent(b.id)}&phone=${encodeURIComponent(b.whatsapp_number || "")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await loadBusinesses();
      } else {
        alert("Failed to remove: " + data.error);
      }
    } catch {
      alert("Failed to remove business.");
    } finally {
      setRemoving(null);
    }
  };

  const handleTogglePause = async (b: Business) => {
    const label = b.business_name || b.name;
    const nextPaused = !b.paused;
    if (nextPaused && !confirm(`Pause "${label}"? Incoming messages will be ignored (data kept).`)) return;
    setTogglingPause(b.id);
    try {
      const res = await fetch("/api/admin/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: b.id, paused: nextPaused }),
      });
      const data = await res.json();
      if (data.success) {
        await loadBusinesses();
      } else {
        alert("Failed: " + data.error);
      }
    } catch {
      alert("Failed to update business.");
    } finally {
      setTogglingPause(null);
    }
  };

  const renderBusiness = (b: Business) => {
    const isOpen = selected === b.id;
    return (
      <div key={b.id} className={`bg-card border rounded-2xl overflow-hidden transition-colors ${isOpen ? "border-primary/40" : "border-border"}`}>
        {/* Name row — clickable */}
        <button
          onClick={() => setSelected(b.id)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-background/40 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full ${b.paused ? "bg-amber-400" : "bg-green-500"}`} />
            <span className="font-bold text-lg truncate">{b.business_name || b.name}</span>
            {b.paused && (
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">Paused</span>
            )}
          </div>
          <span className="shrink-0 text-text-secondary text-xs font-medium">View stats</span>
        </button>
      </div>
    );
  };

  const selectedBusiness = [...clinics, ...schools].find((b) => b.id === selected) || null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card p-8 rounded-3xl border border-border text-center max-w-sm w-full space-y-4 shadow-xl">
          <h1 className="text-2xl font-black">Admin Access</h1>
          <p className="text-text-secondary text-sm">Please enter the admin password.</p>
          <input
            type="password"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center text-lg"
            placeholder="••••••••"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (passwordInput === "mmkrb4747") setIsAuthenticated(true);
                else alert("Incorrect password");
              }
            }}
          />
          <button
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={() => {
              if (passwordInput === "mmkrb4747") setIsAuthenticated(true);
              else alert("Incorrect password");
            }}
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-black mb-5 sm:mb-6">Admin Panel</h1>

      {/* Tab switcher */}
      <div className="grid grid-cols-2 bg-card border border-border p-1 rounded-2xl gap-1 w-full max-w-sm mb-6 sm:mb-8">
        <button
          onClick={() => setActiveTab("businesses")}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "businesses" ? "bg-primary text-white shadow-lg" : "text-text-secondary hover:bg-background"
          }`}
        >
          Businesses
        </button>
        <button
          onClick={() => setActiveTab("keys")}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "keys" ? "bg-primary text-white shadow-lg" : "text-text-secondary hover:bg-background"
          }`}
        >
          API Key Tokens
        </button>
      </div>

      {/* Businesses tab */}
      {activeTab === "businesses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <span>&#127973;</span> Clinics ({clinics.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {clinics.map(renderBusiness)}
              {clinics.length === 0 && <p className="text-text-secondary">No clinics registered.</p>}
            </div>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <span>&#127979;</span> Schools ({schools.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {schools.map(renderBusiness)}
              {schools.length === 0 && <p className="text-text-secondary">No schools registered.</p>}
            </div>
          </div>
        </div>
      )}

      {/* API Key Tokens tab */}
      {activeTab === "keys" && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Groq API Token Usage</h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">Token consumption per API key (free-tier limits).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[720px]">
              <thead className="bg-background text-text-secondary font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Env Var</th>
                  <th className="px-4 py-3 text-right">Total Tokens</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Calls</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3 text-right">Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keyUsage.map((k) => (
                  <tr key={k.key_index} className="hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 font-black">{k.key_index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-background border border-border rounded-md px-2 py-1">{k.env_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-400">{formatTokens(k.total_tokens)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{formatTokens(k.input_tokens)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{formatTokens(k.output_tokens)}</td>
                    <td className="px-4 py-3 text-right">{k.calls}</td>
                    <td className="px-4 py-3 text-text-secondary">{k.last_used ? new Date(k.last_used).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleResetKey(k.key_index)}
                        disabled={resettingKey === k.key_index || (k.calls === 0 && k.total_tokens === 0)}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-secondary bg-background border border-border rounded-lg hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-40"
                      >
                        {resettingKey === k.key_index ? "..." : "Reset"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Business detail full-screen overlay */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-[100]">
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setSelected(null)}
          />
          {/* Modal panel */}
          <div className="relative z-10 min-h-full w-full flex items-center justify-center p-0 sm:p-8">
            <div className="bg-card relative w-full h-full sm:h-auto max-w-2xl sm:rounded-[32px] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between px-5 sm:px-8 py-5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 w-3 h-3 rounded-full ${selectedBusiness.paused ? "bg-amber-400" : "bg-green-500"}`} />
                  <h2 className="text-xl sm:text-2xl font-black italic truncate">{selectedBusiness.business_name || selectedBusiness.name}</h2>
                  {selectedBusiness.paused && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">Paused</span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 p-3 bg-background border border-border rounded-xl hover:border-red-500/50 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Stats */}
              <div className="p-5 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Phone Number</div>
                    <div className="font-bold text-green-400 break-all">{selectedBusiness.whatsapp_number || "Not connected"}</div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Registered</div>
                    <div className="font-bold">{new Date(selectedBusiness.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Incoming Messages</div>
                    <div className="font-bold text-blue-400">{selectedBusiness.messages_incoming}</div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Outgoing Messages</div>
                    <div className="font-bold text-emerald-400">{selectedBusiness.messages_outgoing}</div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Tokens Used</div>
                    <div className="font-bold text-purple-400">{formatTokens(selectedBusiness.token_used)}</div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Email</div>
                    <div className="font-bold break-all text-sm mt-1">{selectedBusiness.email}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleTogglePause(selectedBusiness)}
                    disabled={togglingPause === selectedBusiness.id}
                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border transition-all disabled:opacity-50 ${
                      selectedBusiness.paused
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                    }`}
                  >
                    {togglingPause === selectedBusiness.id ? "..." : selectedBusiness.paused ? "Start" : "Pause"}
                  </button>
                  <button
                    onClick={() => handleRemove(selectedBusiness)}
                    disabled={removing === selectedBusiness.id}
                    className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {removing === selectedBusiness.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
