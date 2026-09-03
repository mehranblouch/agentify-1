"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, Loader2 } from "lucide-react";

const BUSINESS_TYPES = [
  { id: "education", icon: "🏫", name: "Education / School" },
  { id: "clinic", icon: "🏥", name: "Clinic / Doctor" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState<"clinic" | "education" | "">("");
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!businessType) return toast.error("Please select a business type");
    
    setLoading(true);
    const t = toast.loading("Setting up your workspace...");

    try {
      const user = JSON.parse(sessionStorage.getItem("agentify_current_user") || "{}");
      if (!user.id) {
        throw new Error("You must be logged in to complete onboarding.");
      }

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, businessType }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to set business type");

      // Update local storage
      sessionStorage.setItem(
        "agentify_current_user",
        JSON.stringify({ ...user, businessType })
      );

      toast.success("Workspace ready!", { id: t });
      
      if (businessType === "education") {
        router.push("/dashboard/education");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message, { id: t });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic tracking-tight">
            What type of business are you?
          </h1>
          <p className="text-text-secondary font-medium mb-10 text-lg">
            This determines your dashboard and AI capabilities.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setBusinessType(type.id as any)}
                className={`p-8 rounded-[32px] border-2 text-center transition-all ${
                  businessType === type.id 
                    ? "border-primary bg-primary/10 shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] scale-105" 
                    : "border-border bg-card hover:border-text-secondary/50 hover:scale-105"
                }`}
              >
                <div className="text-6xl mb-6">{type.icon}</div>
                <div className="font-black text-xl italic">{type.name}</div>
              </button>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button 
              onClick={handleComplete}
              disabled={loading || !businessType}
              className="px-10 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-white/5"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue to Dashboard"} 
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
