import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Smartphone, Shield } from "lucide-react";

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
            <Link href="#demo" className="hover:text-foreground transition-colors">Live Demo</Link>
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
            Your Business Deserves A <br className="hidden md:block" />
            <span className="text-primary">24/7 AI Customer Agent</span>
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
            Add a smart AI agent to your website in 5 minutes. It connects to WhatsApp, Instagram and your Google Sheet, 
            knows your products, prices, appointments and orders — and answers customers 
            automatically while you sleep.
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
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Works on any website</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free forever plan</div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Sound familiar?</h2>
            <p className="text-text-secondary">There is a smarter way to handle customer support.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "😤", text: "Answering same questions 100 times daily" },
              { icon: "🌙", text: "Missing customers at night when offline" },
              { icon: "📱", text: "Customers asking on WhatsApp non-stop" },
              { icon: "💸", text: "Can't afford 24/7 support staff" }
            ].map((problem, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
                <div className="text-4xl mb-4">{problem.icon}</div>
                <p className="font-medium">{problem.text}</p>
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
              { icon: "📝", title: "Add Info", desc: "Add FAQ, services, timings and rules." },
              { icon: "📊", title: "Add Channels", desc: "Connect WhatsApp, Instagram & Google Sheet." },
              { icon: "🚀", title: "Paste Code", desc: "Copy one line of code to your website." }
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

        {/* Google Sheet Feature */}
        <section className="py-20 bg-card border border-border rounded-3xl p-8 md:p-12 my-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">WhatsApp, Instagram & Google Sheets</h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                No complex integrations. No technical knowledge. Just paste your sheet link. Your AI agent reads your live products, orders, and appointments automatically.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-text-secondary">Read only — we can never edit your data</span>
                </li>
                <li className="flex items-start gap-3">
                  <Database className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-text-secondary">Updates instantly when you change sheet</span>
                </li>
                <li className="flex items-start gap-3">
                  <Smartphone className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-text-secondary">Works from your phone anywhere</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-background border border-border rounded-xl p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-text-secondary ml-2">inventory.xlsx</span>
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <div className="grid grid-cols-3 gap-4 text-text-secondary pb-2 border-b border-border/50">
                    <span>Product</span><span>Stock</span><span>Price</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <span>Nike Air Max</span><span className="text-primary">3 in stock</span><span>Rs.12000</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <span>Nike Pro</span><span className="text-red-500">Out of stock</span><span>Rs.8000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business Types */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built For Every Business</h2>
            <p className="text-text-secondary">Whatever you sell, Agentify can handle it.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🏥", title: "Clinics & Doctors", desc: "Book appointments, answer patient questions, share timings" },
              { icon: "🛒", title: "Ecommerce Stores", desc: "Check stock, track orders, answer product questions" },
              { icon: "📦", title: "Courier Services", desc: "Track parcels, answer delivery questions, give updates" },
              { icon: "🍕", title: "Restaurants", desc: "Share menu, take reservations, answer food questions" },
              { icon: "💇", title: "Salons & Spas", desc: "Book appointments, share services, answer pricing questions" },
              { icon: "🏫", title: "Tuition Centers", desc: "Share schedules, answer fee questions, book trial classes" }
            ].map((type, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
                <div className="text-3xl mb-4">{type.icon}</div>
                <h3 className="text-lg font-bold mb-2">{type.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{type.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4 border border-secondary/20">
              Try It Right Now
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Your New Assistant</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              This is a real AI agent trained on a sample "City Medical Clinic". 
              Ask it about appointments, timings, fees, or available doctors.
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
            <div className="bg-border/50 p-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="text-2xl">🤖</div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm">City Medical Clinic</h3>
                  <p className="text-xs text-text-secondary">Replies instantly</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              <div className="bg-background border border-border rounded-2xl rounded-tl-sm p-3 max-w-[85%] text-sm self-start">
                Welcome to City Medical Clinic! How can I help you today? 😊 You can ask me about our timings, doctors, fees, or how to book an appointment.
              </div>
              <div className="text-center text-xs text-text-secondary my-4">
                (Demo mode: Type a message below to test)
              </div>
            </div>
            <div className="p-4 border-t border-border bg-background">
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-2">
                <input 
                  type="text" 
                  placeholder="Ask about fees or timings..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm px-2"
                  disabled
                />
                <button disabled className="p-2 bg-primary rounded-lg text-white opacity-50">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Businesses Love Agentify</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Dr. Ayesha Khan", location: "Lahore", text: "My patients book appointments at midnight without calling me. I wake up with confirmed bookings in my Google Sheet." },
              { name: "Hassan Electronics", location: "Karachi", text: "Customers ask about stock and prices all day. My Google Sheet has all products. Agent answers everything automatically." },
              { name: "QuickSend Courier", location: "Islamabad", text: "Customers track their own parcels now. I just update my tracking sheet. My phone doesn't ring 100 times daily." }
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
              { q: "Does it work on WordPress?", a: "Yes. Works on WordPress, Wix, Shopify, and any website. Just paste one line." },
              { q: "Do I need technical knowledge?", a: "Zero. If you can use WhatsApp, you can use Agentify." },
              { q: "Can the agent edit my Google Sheet?", a: "Never. Read only access. Your data is always safe." },
              { q: "What language does it speak?", a: "English and Urdu both supported natively." }
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
              <span className="text-xs text-text-secondary">Your business. Always online.</span>
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
