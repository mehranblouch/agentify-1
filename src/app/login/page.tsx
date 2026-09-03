"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Bot, Mail, Lock, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error("Please fill in all fields.");
    }

    setLoading(true);
    const loadingToast = toast.loading("Signing in...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const result = await res.json();

      if (!result.success) throw new Error(result.error || "Invalid credentials");

      // Store session in sessionStorage
      sessionStorage.setItem(
        "agentify_current_user",
        JSON.stringify({ id: result.id, email: result.email, name: result.name, businessType: result.business_type })
      );
      toast.success("Welcome back!", { id: loadingToast });
      if (result.business_type === "education") {
        router.push("/dashboard/education");
      } else if (result.business_type === "clinic") {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials.", { id: loadingToast });
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
            Welcome Back
          </h1>
          <p className="text-text-secondary font-medium mt-2">Log in to manage your Agentify platform.</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="email"
                  id="login-email"
                  placeholder="your@email.com"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="password"
                  id="login-password"
                  placeholder="enter your password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-background border border-border rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary transition-all font-medium text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-xs text-text-secondary mt-8 font-medium">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
