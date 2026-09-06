"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Mail, Lock, Building2, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptedPolicy: false });
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      return toast.error("Please fill in all fields.");
    }
    if (!form.acceptedPolicy) {
      return toast.error("Please accept the Terms of Service to continue.");
    }

    setLoading(true);
    const loadingToast = toast.loading("Creating your account...");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          acceptedPolicy: form.acceptedPolicy,
        }),
      });
      const result = await res.json();

      if (!result.success) throw new Error(result.error || "Registration failed");

      // Store session in sessionStorage
      sessionStorage.setItem(
        "agentify_current_user",
        JSON.stringify({ id: result.id, email: result.email, name: result.name, businessType: result.business_type })
      );
      toast.success("Account created!", { id: loadingToast });
      router.push("/onboarding");
    } catch (err: any) {
      toast.error(err.message || "Registration failed.", { id: loadingToast });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6 border border-primary/20">
            <Bot className="w-8 h-8 text-primary" />
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic tracking-tight">
            Create your Agent
          </h1>
          <p className="text-text-secondary font-medium mt-2">Start automating your business in minutes.</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleRegister} className="space-y-5" autoComplete="off">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                Business Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  id="register-name"
                  placeholder="e.g. Ayesha Clinic"
                  autoComplete="off"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                Gmail Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="email"
                  id="register-email"
                  placeholder="your@gmail.com"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="register-password"
                  placeholder="enter your password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-12 outline-none focus:border-primary transition-all font-medium text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label
              id="register-policy"
              htmlFor="register-policy-input"
              className="flex items-start gap-3 bg-background/60 border border-border rounded-2xl p-4 cursor-pointer select-none hover:border-primary/40 transition-all"
            >
              <input
                type="checkbox"
                id="register-policy-input"
                className="sr-only"
                checked={form.acceptedPolicy}
                onChange={(e) => setForm({ ...form, acceptedPolicy: e.target.checked })}
              />
              <span
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  form.acceptedPolicy ? "bg-primary border-primary" : "border-text-secondary/40 bg-background"
                }`}
              >
                {form.acceptedPolicy && (
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="text-xs leading-relaxed text-text-secondary font-medium">
                I agree to the Terms of Service and Acceptable Use Policy. I understand that I am solely
                responsible for the content, messages, data, and activities carried out through my account
                and for ensuring that my use of the platform complies with applicable laws.
              </span>
            </label>

            <button
              type="submit"
              id="register-submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-xs text-text-secondary mt-8 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
