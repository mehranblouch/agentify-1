"use client";

import { useState, useEffect, useRef } from "react";

type Step = "idle" | "connecting" | "pairing" | "checking" | "connected" | "error";

export default function WhatsAppSetup() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Check existing connection on initial load
  useEffect(() => {
    const checkInitialConnection = async () => {
      const savedPhone = localStorage.getItem("agentify_whatsapp_phone") || "";
      if (savedPhone) {
        setPhoneNumber(savedPhone);
        try {
          const res = await fetch(`/api/integrations/whatsapp/health?phone=${encodeURIComponent(savedPhone)}`);
          const data = await res.json();
          if (data.connected || data.paired) {
            setStep("connected");
          }
        } catch {}
      } else {
        // Try getting number from doctor settings
        try {
          const userStr = localStorage.getItem("agentify_current_user");
          const userId = userStr ? JSON.parse(userStr)?.id : "default";
          const res = await fetch(`/api/doctor-settings?userId=${userId}`);
          const data = await res.json();
          if (data.data?.whatsapp_number) {
            const num = data.data.whatsapp_number.replace(/\D/g, "");
            setPhoneNumber(num);
            const healthRes = await fetch(`/api/integrations/whatsapp/health?phone=${encodeURIComponent(num)}`);
            const healthData = await healthRes.json();
            if (healthData.connected || healthData.paired) {
              setStep("connected");
              localStorage.setItem("agentify_whatsapp_phone", num);
            }
          }
        } catch {}
      }
    };
    checkInitialConnection();
  }, []);

  // Auto-poll connection status after pairing code is shown
  useEffect(() => {
    if (step !== "pairing") return;
    if (pollRef.current) clearInterval(pollRef.current);

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(
          `/api/integrations/whatsapp/health?phone=${encodeURIComponent(phoneNumber)}`
        );
        const data = await res.json();
        if (data.connected || data.paired) {
          clearInterval(pollRef.current!);
          setStep("connected");
          localStorage.setItem("agentify_whatsapp_phone", phoneNumber);
        }
      } catch (_) {}
      // Stop after 3 minutes
      if (attempts >= 60) clearInterval(pollRef.current!);
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, phoneNumber]);

  const clean = (n: string) => n.replace(/\D/g, "");

  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem("agentify_current_user");
      const user = userStr ? JSON.parse(userStr) : null;
      return {
        userId: user?.id || "default",
        businessType: (user?.business_type as "clinic" | "education") || "clinic",
      };
    } catch {
      return { userId: "default", businessType: "clinic" as const };
    }
  };

  const generatePairingCode = async () => {
    const num = clean(phoneNumber);
    if (num.length < 7) { setError("Please enter a valid phone number with country code (e.g. 923001234567)"); return; }
    setError(null);
    setPairingCode(null);
    setStep("connecting");
    localStorage.setItem("agentify_whatsapp_phone", num);
    const { userId, businessType } = getUserInfo();
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: num, userId, businessType }),
      });
      const data = await res.json();
      if (data.success) {
        setPairingCode(data.pairingCode);
        setStep("pairing");
      } else {
        setError(data.error || "Failed to get pairing code");
        setStep("error");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
      setStep("error");
    }
  };


  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("idle");
    setPairingCode(null);
    setError(null);
    localStorage.removeItem("agentify_whatsapp_phone");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Inter', sans-serif",
      padding: "1rem",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "2rem",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        color: "#fff",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📱</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>WhatsApp Setup</h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>
            Connect your WhatsApp number to the AI receptionist
          </p>
        </div>

        {/* Step: idle or error – show input */}
        {(step === "idle" || step === "error") && (
          <div>
            <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "0.4rem" }}>
              WhatsApp Number (with country code, digits only)
            </label>
            <input
              type="tel"
              placeholder="e.g. 923001234567"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {error && (
              <div style={{ background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.4)", borderRadius: "8px", padding: "0.75rem", marginTop: "0.75rem", fontSize: "0.85rem", color: "#ff8080" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={generatePairingCode}
              style={{
                width: "100%", marginTop: "1rem", padding: "0.85rem", borderRadius: "12px",
                border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem",
                background: "linear-gradient(135deg, #25d366, #128c7e)",
                color: "#fff", boxShadow: "0 4px 15px rgba(37,211,102,0.3)",
                transition: "transform 0.1s",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              Get Pairing Code
            </button>
          </div>
        )}

        {/* Step: connecting spinner */}
        {step === "connecting" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{
              width: "60px", height: "60px", margin: "0 auto 1rem",
              border: "4px solid rgba(37,211,102,0.2)",
              borderTop: "4px solid #25d366",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Connecting to WhatsApp…</p>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>
              This may take up to 20 seconds
            </p>
          </div>
        )}

        {/* Step: numeric pairing code */}
        {step === "pairing" && pairingCode && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Open WhatsApp → Linked Devices → Link with phone number → Enter this code:
            </p>
            <div style={{
              background: "rgba(37,211,102,0.1)",
              border: "2px solid rgba(37,211,102,0.4)",
              borderRadius: "16px", padding: "1.5rem",
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.15em", color: "#25d366" }}>
                {pairingCode}
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>
                Code expires in ~60 seconds
              </p>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#25d366", animation: "pulse 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>Waiting for confirmation…</span>
            </div>
            <button onClick={reset} style={{ marginTop: "1rem", background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.5)", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.8rem" }}>
              ← Try Again
            </button>
          </div>
        )}

        {/* Step: connected! */}
        {step === "connected" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>✅</div>
            <h2 style={{ fontWeight: 700, fontSize: "1.3rem", color: "#25d366" }}>WhatsApp Connected!</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Your AI receptionist is now active on WhatsApp.
            </p>
            <button onClick={reset} style={{
              marginTop: "1.5rem", padding: "0.75rem 2rem", borderRadius: "10px",
              border: "none", background: "rgba(37,211,102,0.2)", color: "#25d366",
              fontWeight: 600, cursor: "pointer",
            }}>
              Connect Another Number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
