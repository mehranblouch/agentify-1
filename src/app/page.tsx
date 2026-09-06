import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold font-sans">Agentify</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-black text-black bg-white rounded-xl hover:bg-white/90 transition-colors shadow-lg shadow-white/10">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="text-center py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <span>🚀</span> Now in Beta — Join Free Today
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Your Clinic & School Deserves A <br className="hidden md:block" />
            <span className="text-primary">24/7 AI Assistant</span>
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
            Agentify answers your patients and parents on WhatsApp automatically — booking appointments for
            clinics, sending attendance updates for schools, and keeping every conversation answered
            while you sleep.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 text-base font-black text-black bg-white rounded-2xl hover:bg-white/90 transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-2">
              Create My Agent — Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-card border border-border rounded-2xl hover:border-primary/50 transition-colors">
              Log in
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-secondary">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> No credit card</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> 5 minute setup</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Works inside WhatsApp</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free forever plan</div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything your clinic or school needs</h2>
            <p className="text-text-secondary">One AI agent that never sleeps, never misses a message.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🏥", title: "Appointments on WhatsApp", desc: "Patients message your clinic number and the AI books, confirms and reschedules appointments automatically." },
              { icon: "🗓️", title: "Timings & Fees, Always Known", desc: "Consultation hours, fee structure and location — answered instantly, at midnight or on weekends." },
              { icon: "📚", title: "Import Students from CSV", desc: "Export your list from Excel, upload it, and your entire student database is ready in minutes." },
              { icon: "✅", title: "Attendance Sent to Parents", desc: "Mark present or absent in one tap and parents get a personal WhatsApp update the same moment." },
              { icon: "📲", title: "Works Inside WhatsApp", desc: "No apps to install, no websites to visit. Patients and parents already use WhatsApp every day." },
              { icon: "⚡", title: "Live in Minutes, No Tech Skills", desc: "Set up your clinic or school in under five minutes with a simple step-by-step flow." }
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:-translate-y-1 transition-transform">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Up and running in 5 minutes</h2>
            <p className="text-text-secondary">No technical knowledge required.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-border -z-10" />
            {[
              { icon: "👤", title: "Create Account", desc: "Sign up free. No credit card needed." },
              { icon: "🏥", title: "Pick Clinic or School", desc: "Choose your type and tell the agent your timings, fees or classes." },
              { icon: "📲", title: "Add Your Students Or Patients", desc: "Import your student CSV or connect your clinic WhatsApp number." },
              { icon: "🚀", title: "Go Live", desc: "Your AI agent starts answering messages right away." }
            ].map((step, i) => (
              <div key={i} className="relative bg-background pt-4 md:pt-0">
                <div className="w-16 h-16 mx-auto bg-card border-2 border-primary rounded-full flex items-center justify-center text-2xl mb-6 shadow-[0_0_15px_rgba(22,163,74,0.2)]">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Step {i + 1}: {step.title}</h3>
                <p className="text-text-secondary text-center text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WhatsApp + Privacy */}
        <section className="py-20 bg-card border border-border rounded-3xl p-8 md:p-12 my-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">WhatsApp-First. Simple by design.</h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                No complex integrations and no new apps for your customers. Your agent lives in the
                WhatsApp number people already know for your clinic or school.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Smartphone className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-text-secondary">Runs entirely inside WhatsApp — patients and parents need nothing else</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-text-secondary">Only the data you add is used — never shared, never public</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-text-secondary">Change timings, fees or student lists anytime from your dashboard</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-background border border-border rounded-xl p-4 shadow-2xl font-mono text-xs sm:text-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-text-secondary ml-2">WhatsApp chat</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-background border border-border rounded-xl rounded-tl-sm p-3 max-w-[85%] self-start">
                    <span className="text-text-secondary">Salam! Doctor ka time kya hai aaj?</span>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm p-3 max-w-[85%] ml-auto text-primary">
                    <span>Doctor Kamran is available 6 PM — 9 PM today. Shall I book you a slot? 😊</span>
                  </div>
                  <div className="bg-background border border-border rounded-xl rounded-tl-sm p-3 max-w-[85%] self-start">
                    <span className="text-text-secondary">Yes please, 7 PM.</span>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm p-3 max-w-[85%] ml-auto text-primary">
                    <span>Done — your appointment is confirmed for today 7:00 PM. We'll remind you! ✅</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business Types */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the two businesses that matter</h2>
            <p className="text-text-secondary">Pick your type at signup and Agentify adapts itself.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🏥", title: "Clinics & Doctors", points: ["Appointments booked automatically on WhatsApp", "Timings, location and fees answered instantly", "Reminders sent so fewer patients miss their visit"] },
              { icon: "🏫", title: "Schools & Academies", points: ["Full student list imported from a simple CSV", "Daily attendance marked in one tap", "Parents receive attendance updates on WhatsApp"] }
            ].map((type, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-8 hover:-translate-y-1 transition-transform">
                <div className="text-4xl mb-4">{type.icon}</div>
                <h3 className="text-xl font-bold mb-4">{type.title}</h3>
                <ul className="space-y-3">
                  {type.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Businesses Love Agentify</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Dr. Ayesha Khan", location: "Clinic, Lahore", text: "My patients book appointments at midnight without calling me. I wake up with confirmed bookings already in my dashboard." },
              { name: "Saima Ali", location: "School, Faisalabad", text: "I imported all 400 students from Excel in minutes. Parents now get attendance on WhatsApp before I've even had my tea." },
              { name: "Rehan Iqbal", location: "Academy, Karachi", text: "Fee questions, class timings, session updates — the agent handles them all. My staff finally focus on teaching, not replying." }
            ].map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 relative">
                <div className="text-primary mb-4 text-sm">⭐⭐⭐⭐⭐</div>
                <p className="text-sm text-text-secondary mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 bg-border rounded-full flex items-center justify-center font-bold text-text-secondary">
                    {t.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{t.name}</h4>
                    <p className="text-xs text-text-secondary">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Common Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Which businesses does Agentify work with?", a: "Clinics and doctors, plus schools, academies and tuition centers. Pick your type at signup and the agent adapts itself." },
              { q: "How do patients book appointments?", a: "They message your WhatsApp number and the AI books, confirms and reschedules appointments automatically — even at 3 AM." },
              { q: "How do I add my students?", a: "Export your student list from Excel as a CSV and upload it. Names and numbers import in minutes, ready for attendance." },
              { q: "How do parents get attendance updates?", a: "Mark each class present or absent from your dashboard and parents receive a personal WhatsApp message straight away." },
              { q: "Do my customers need to install anything?", a: "No. Everything runs inside WhatsApp, which they already use every day." },
              { q: "Do I need technical knowledge?", a: "Zero. If you can send a WhatsApp message, you can run Agentify." }
            ].map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <span className="text-xl font-bold font-sans block">Agentify</span>
              <span className="text-xs text-text-secondary">Your clinic & school. Always online.</span>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="#" className="hover:text-foreground">About</Link>
            <Link href="#" className="hover:text-foreground">Docs</Link>
            <Link href="#" className="hover:text-foreground">Contact</Link>
          </div>
          <div className="text-sm text-text-secondary">
            &copy; {new Date().getFullYear()} Agentify
          </div>
        </div>
      </footer>
    </div>
  );
}