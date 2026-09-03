"use client";

import { Database, AlertTriangle, RefreshCw, ExternalLink, Smartphone, Camera, MessageSquare, Plus, CheckCircle2, Loader2, Info, FileSpreadsheet, Upload, Mail } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { countries, Country } from "@/lib/countries";

export default function IntegrationsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === "+92") || countries[0]);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [verifyingConnection, setVerifyingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastPhoneNumber, setLastPhoneNumber] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Clean up polling interval on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  const verifyWhatsAppConnection = async (phoneNumber: string, pairingCode: string = "") => {
    try {
      // First try the confirm endpoint which waits for credentials
      const confirmRes = await fetch("/api/integrations/whatsapp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, pairingCode })
      });

      const confirmData = await confirmRes.json();

      if (confirmData.success && confirmData.paired) {
        // Pairing was successful
        if (confirmData.connected) {
          // Already connected
          setWhatsappConnected(true);
          setVerifyingConnection(false);
          setConnectionError(null);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          toast.success("✅ WhatsApp connected successfully!", { id: "whatsapp-verify" });
          return true;
        } else {
          // Paired but not connected yet, keep polling
          return false;
        }
      } else if (confirmData.retryable) {
        // Keep polling
        return false;
      } else {
        // Pairing failed
        setConnectionError(confirmData.error || "Pairing failed");
        setVerifyingConnection(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        toast.error(confirmData.error || "Pairing failed", { id: "whatsapp-verify" });
        return false;
      }
    } catch (err) {
      console.error("Verification error:", err);
      return false;
    }
  };

  const startConnectionPolling = (phoneNumber: string, pairingCode: string) => {
    setVerifyingConnection(true);
    setConnectionError(null);
    let pollCount = 0;
    const maxPolls = 90; // 90 attempts * 1 second = 90 seconds timeout

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log(`Starting polling for pairing code: ${pairingCode}`);

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(pollingIntervalRef.current!);
        setVerifyingConnection(false);
        setConnectionError("Connection timeout. Please scan the code in WhatsApp settings and try again.");
        toast.error("Connection timeout - please try again", { id: "whatsapp-verify" });
        return;
      }

      const connected = await verifyWhatsAppConnection(phoneNumber, pairingCode);
      if (connected) {
        clearInterval(pollingIntervalRef.current!);
      }
    }, 1000);
  };

  const handleSync = (type: string) => {
    setLoading(type);
    toast.loading(`Syncing ${type}...`, { id: "sync" });
    setTimeout(() => {
      setLoading(null);
      toast.success(`${type} synced successfully!`, { id: "sync" });
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading("Static Files");
    const loadingToast = toast.loading(`Uploading ${file.name}...`);
    
    // Simulate upload
    setTimeout(() => {
      setLoading(null);
      toast.success(`${file.name} uploaded and indexed!`, { id: loadingToast });
    }, 2500);
  };

  const generatePairingCode = async () => {
    if (!whatsappPhone) {
      toast.error("Please enter a phone number");
      return;
    }
    
    setLoading("whatsapp");
    setPairingCode(null);
    setWhatsappConnected(false);
    setConnectionError(null);
    
    const loadingToast = toast.loading("Connecting to WhatsApp servers...");
    
    const fullNumber = `${selectedCountry.code}${whatsappPhone}`.replace(/\D/g, "");
    setLastPhoneNumber(fullNumber);
    
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullNumber })
      });
      
      if (!res.ok) {
        const text = await res.text();
        const data = text.startsWith('{') ? JSON.parse(text) : { error: `Server error: ${res.status}` };
        throw new Error(data.error || text);
      }
      
      const data = await res.json();
      
      if (data.success && data.pairingCode) {
        setPairingCode(data.pairingCode);
        toast.success(`📱 Scan this code in WhatsApp Settings → Linked Devices`, { id: loadingToast });
        
        // Start polling for connection verification using the pairing code
        startConnectionPolling(fullNumber, data.pairingCode);
      } else {
        toast.error(data.error || "Failed to generate code", { id: loadingToast });
      }
    } catch (err) {
      console.error("Error generating pairing code:", err);
      toast.error("Network error. Please ensure server is running.", { id: loadingToast });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">Multi-Channel</span>
          </div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">Knowledge Sources</h2>
          <p className="text-text-secondary text-sm font-medium">Power your agent with live data from multiple channels.</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-card border border-border rounded-xl flex items-center gap-2 text-xs font-medium">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
             Engine v1.0.4
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WhatsApp Card */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500/20 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-card border border-border rounded-2xl p-8 flex flex-col h-full hover:border-green-500/30 transition-colors">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-inner">
                <MessageSquare className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">WhatsApp Connectivity</h3>
                <p className="text-sm text-text-secondary font-medium">Secure Web Engine</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-background/50 border border-border rounded-2xl p-5 backdrop-blur-sm">
                <label className="text-[10px] font-black text-text-secondary uppercase mb-3 block tracking-widest">Phone Number</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 relative">
                    <div className="relative w-32" ref={dropdownRef}>
                      <div 
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="bg-background border border-border rounded-xl px-3 py-3 text-sm focus:border-green-500 outline-none transition-all font-medium cursor-pointer flex items-center justify-between gap-1"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{selectedCountry.flag}</span>
                          <span>{selectedCountry.code}</span>
                        </span>
                        <Plus className={`w-3 h-3 transition-transform ${showCountryDropdown ? 'rotate-45' : ''}`} />
                      </div>

                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                          <div className="p-2 border-b border-border bg-background/50">
                            <input 
                              type="text" 
                              placeholder="Search country..." 
                              autoFocus
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-green-500"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((c) => (
                                <div 
                                  key={c.name}
                                  onClick={() => {
                                    setSelectedCountry(c);
                                    setShowCountryDropdown(false);
                                    setCountrySearch("");
                                  }}
                                  className="flex items-center justify-between p-2.5 hover:bg-primary/10 rounded-lg cursor-pointer transition-colors group"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{c.flag}</span>
                                    <span className="text-xs font-medium truncate max-w-[120px]">{c.name}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-text-secondary group-hover:text-primary transition-colors">{c.code}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-text-secondary">No results found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="305 1510206" 
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-all font-medium placeholder:text-text-secondary/50"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Smartphone className="w-4 h-4 text-text-secondary/30" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={generatePairingCode}
                    disabled={loading === "whatsapp"}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                  >
                    {loading === "whatsapp" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect Business WhatsApp"}
                  </button>
                </div>
              </div>

              {pairingCode && (
                <div className="space-y-4">
                  <div className={`border rounded-2xl p-6 text-center animate-in zoom-in-95 duration-300 ${
                    whatsappConnected 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-green-500/5 border-green-500/20"
                  }`}>
                    <p className="text-[10px] font-black text-green-500 mb-3 uppercase tracking-widest">
                      {whatsappConnected ? "✅ Connected!" : "Pairing Code"}
                    </p>
                    <div className="flex justify-center gap-2 mb-4">
                      {pairingCode.split('').map((char, i) => (
                        <span key={i} className={`w-10 h-12 border rounded-lg flex items-center justify-center text-2xl font-black shadow-sm ${
                          whatsappConnected
                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                            : "bg-background border-green-500/30 text-green-500"
                        }`}>
                          {char}
                        </span>
                      ))}
                    </div>
                    {!whatsappConnected && (
                      <p className="text-xs text-text-secondary">Scan this code on your phone...</p>
                    )}
                  </div>

                  {verifyingConnection && !whatsappConnected && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      <p className="text-sm font-medium text-blue-500">Waiting for connection confirmation...</p>
                    </div>
                  )}

                  {connectionError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-500">{connectionError}</p>
                        <button
                          onClick={generatePairingCode}
                          className="text-xs text-red-500 hover:text-red-400 mt-2 underline"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}

                  {whatsappConnected && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-black text-green-500">WhatsApp Ready</p>
                        <p className="text-xs text-green-500/70">Connected to {lastPhoneNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instagram Card */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-pink-500/20 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-card border border-border rounded-2xl p-8 flex flex-col h-full hover:border-pink-500/30 transition-colors">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/20 shadow-inner">
                <Camera className="w-7 h-7 text-pink-500" />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">Instagram Automation</h3>
                <p className="text-sm text-text-secondary font-medium">Direct Message Intelligence</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <p className="text-sm text-text-secondary leading-relaxed font-medium">
                Connect your Instagram Business account to automate your DMs and comments with AI.
              </p>
              
              <button 
                className="w-full py-4 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-lg"
                onClick={() => toast.success("Instagram OAuth ready!")}
              >
                <Camera className="w-5 h-5" />
                Connect via Meta
              </button>

              <div className="p-4 bg-background/50 border border-border rounded-2xl">
                <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  Official Meta API Support
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Excel / CSV Card */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-card border border-border rounded-2xl p-8 flex flex-col h-full hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                <FileSpreadsheet className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">Static Knowledge</h3>
                <p className="text-sm text-text-secondary font-medium">Excel, CSV, PDF Documents</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv,.pdf"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-background/30 group-hover:border-blue-500/30 transition-all cursor-pointer hover:bg-blue-500/5"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black">Click to upload file</p>
                  <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-widest font-bold">Supports .xlsx, .csv, .pdf</p>
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-wider">AI Training: Active</p>
              </div>
            </div>

            <button 
              onClick={() => handleSync("Static Files")}
              disabled={loading === "Static Files"}
              className="mt-8 w-full py-3 bg-background border border-border hover:border-blue-500/50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              {loading === "Static Files" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh Knowledge
            </button>
          </div>
        </div>

        {/* Google Sheet Card */}
        <div className="bg-card border border-border rounded-3xl p-8 lg:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-3xl -mr-32 -mt-32"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-green-600/10 rounded-2xl flex items-center justify-center border border-green-600/20 shadow-inner">
                <Database className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-2xl tracking-tight italic">Live Sheet Sync</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-tighter border border-green-500/20">Enterprise</span>
                </div>
                <p className="text-sm text-text-secondary font-medium">Automatic data extraction from shared Google Sheets.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleSync("Google Sheets")}
                disabled={loading === "Google Sheets"}
                className="px-8 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-white/90 transition-all flex items-center gap-2 shadow-xl shadow-white/10 disabled:opacity-50"
              >
                {loading === "Google Sheets" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Force Sync
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 pt-8 border-t border-border">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-secondary uppercase block tracking-widest">Spreadsheet URI</label>
              <div className="relative">
                <input 
                  type="url" 
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-all font-medium"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <ExternalLink className="w-4 h-4 text-text-secondary/30" />
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
              <p className="text-[10px] text-yellow-500/80 leading-relaxed font-medium">
                Make sure your sheet is set to **"Anyone with the link can view"**. 
                The AI will automatically update its knowledge every 5 minutes from this source.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-2xl -mr-16 -mt-16"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-xl text-red-500 mb-1 uppercase tracking-tight">System Termination</h4>
            <p className="text-sm text-text-secondary font-medium mb-0">Disconnecting will permanently disable AI responses across all active channels.</p>
          </div>
          <button className="w-full md:w-auto px-8 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
            Purge All Connections
          </button>
        </div>
      </div>
    </div>
  );
}
