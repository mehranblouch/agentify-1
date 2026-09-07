import Link from "next/link";
import { Bot, ShieldCheck, Zap, HeartHandshake } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold font-sans">Agentify</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <Link href="/about" className="text-primary font-bold">About</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
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
            About <span className="text-primary">Agentify</span>
          </h1>
          <p className="text-lg text-text-secondary">
            We give clinics and schools a 24/7 AI assistant that lives inside WhatsApp.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 md:p-10 mb-8">
          <h2 className="text-xl font-bold mb-3">Who we are</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Agentify is a team focused on one problem: small clinics and schools across Pakistan work
            incredibly hard, but they are offline at night, on weekends, and during every busy moment.
            Patients and parents message on WhatsApp at all hours, and most of those messages go
            unanswered until morning.
          </p>
          <p className="text-text-secondary leading-relaxed">
            We built an AI assistant that answers in seconds, books appointments for clinics, and sends
            attendance updates for schools — all through the WhatsApp number people already know.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {[
            { icon: Bot, title: "WhatsApp-native", desc: "No new apps or links to learn. It works where your customers already are." },
            { icon: Zap, title: "A real AI agent", desc: "Understands questions in Urdu and English and responds instantly, day or night." },
            { icon: ShieldCheck, title: "Your data stays yours", desc: "Only the information you add is used — never shared, never sold." },
            { icon: HeartHandshake, title: "Built for real life", desc: "Simple enough for a doctor or school principal, not just developers." }
          ].map((v, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6">
              <v.icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1">{v.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-text-secondary mb-5">Set up your clinic or school in under five minutes.</p>
          <Link href="/register" className="inline-flex px-8 py-4 text-base font-black text-black bg-white rounded-2xl hover:bg-white/90 transition-all shadow-xl shadow-white/10">
            Create My Agent — Free
          </Link>
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