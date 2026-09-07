"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, Loader2, Send } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      return toast.error("Name, email and message are required.");
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send message.");
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold font-sans">Agentify</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/contact" className="text-primary font-bold">Contact</Link>
            <Link href="/#reviews" className="hover:text-foreground transition-colors">Reviews</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-white transition-colors">Log in</Link>
            <Link href="/register" className="px-4 py-2 text-sm font-black text-black bg-white rounded-xl hover:bg-white/90 transition-colors shadow-lg shadow-white/10">Start Free</Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Contact <span className="text-primary">us</span>
          </h1>
          <p className="text-lg text-text-secondary">
            Questions, feedback or need help getting live? Send a message and we&apos;ll reply.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 md:p-10 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Your Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ayesha Khan"
                  className="w-full bg-background border border-border rounded-2xl py-3 px-4 outline-none focus:border-primary transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Your Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@gmail.com"
                  className="w-full bg-background border border-border rounded-2xl py-3 px-4 outline-none focus:border-primary transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="How can we help?"
                className="w-full bg-background border border-border rounded-2xl py-3 px-4 outline-none focus:border-primary transition-all font-medium text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us what you need..."
                rows={5}
                className="w-full bg-background border border-border rounded-2xl py-3 px-4 outline-none focus:border-primary transition-all font-medium text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-8 text-center flex flex-col items-center gap-3">
          <Mail className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-bold">Prefer email?</h2>
          <p className="text-text-secondary text-sm">Write to us and mention your business name.</p>
          <a href="mailto:support@agentify.app" className="inline-flex px-6 py-3 text-sm font-black text-black bg-white rounded-xl hover:bg-white/90 transition-all">
            support@agentify.app
          </a>
          <p className="text-xs text-text-secondary mt-2">
            New here? <Link href="/register" className="text-primary font-bold hover:underline">Create your free account</Link> instead.
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <span className="text-xl font-bold font-sans block">Agentify</span>
              <span className="text-xs text-text-secondary">Your business. Always online.</span>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
          <div className="text-sm text-text-secondary">&copy; {new Date().getFullYear()} Agentify</div>
        </div>
      </footer>
    </div>
  );
}