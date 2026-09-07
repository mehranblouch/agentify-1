import Link from "next/link";
import { Bot, Calendar, Users, CheckCircle, FileUp } from "lucide-react";

export default function DocsPage() {
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
            <Link href="/docs" className="text-primary font-bold">Docs</Link>
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
            <span className="text-primary">Documentation</span>
          </h1>
          <p className="text-lg text-text-secondary">Everything you need to get your clinic or school live with Agentify.</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 md:p-10 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> Quick start
          </h2>
          <ol className="space-y-3 text-text-secondary">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-black">1</span>
              <span><Link href="/register" className="text-primary font-bold hover:underline">Create a free account</Link>. No credit card needed.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-black">2</span>
              <span>Choose your business type — <strong>Clinic</strong> or <strong>School</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-black">3</span>
              <span>Add your settings (timings, fees, institute details) from the dashboard.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-black">4</span>
              <span>Connect WhatsApp and start receiving messages. You are live.</span>
            </li>
          </ol>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> For clinics
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>• Set consultation hours, fees and location in <Link href="/dashboard" className="text-primary hover:underline">Settings</Link>.</li>
              <li>• Patients message your WhatsApp number; the AI books and confirms appointments.</li>
              <li>• Appointment reminders reduce missed visits.</li>
              <li>• View all appointments in the dashboard.</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> For schools
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>• Import your full student list from Excel as a CSV.</li>
              <li>• Names and phone numbers import automatically — duplicates are skipped.</li>
              <li>• Mark attendance class by class in one tap.</li>
              <li>• Parents get attendance updates on WhatsApp instantly.</li>
            </ul>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" /> Importing students (CSV)
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            Export your class list from Excel as a <strong>.csv</strong> file. Agentify automatically detects the
            columns for student name, father&apos;s name and phone number. A preview shows the first rows
            before importing, and rows missing a name or number are highlighted so you can fix them first.
            Up to 5,000 students can be imported at once.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Phone numbers are normalized to Pakistani format (+92) automatically.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" /> Safety & privacy
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            We only use the information you add to your account. Student and patient data is stored securely
            and never shared with third parties. You can remove a business and all its data from the admin
            panel at any time.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-text-secondary">
            Still stuck?{" "}
            <Link href="/contact" className="text-primary font-bold hover:underline">Contact us</Link> and we&apos;ll help you live.
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