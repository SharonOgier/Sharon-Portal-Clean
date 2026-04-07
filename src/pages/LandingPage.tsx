import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { TIERS, TIER_ORDER } from "../portal/tierConfig";

const tiers = TIER_ORDER.map((key) => {
  const t = TIERS[key as keyof typeof TIERS];
  return {
    key: t.key,
    name: t.label,
    price: t.price,
    tag: t.tag,
    recommended: !!(t as any).recommended,
    features: t.features,
    locked: t.lockedFeatures || [],
    comingSoon: (t as any).comingSoon || [],
  };
});

const features = [
  { icon: "🔨", title: "Jobs & Scheduling", desc: "Plan your week, assign jobs to your team, and see exactly who is where — all from your phone." },
  { icon: "📋", title: "Quotes & Invoices", desc: "Create professional quotes in minutes. Turn them into invoices with one tap. Get paid faster." },
  { icon: "📍", title: "Properties & Sites", desc: "Track work across multiple sites, properties and paddocks. Every job linked to a location." },
  { icon: "👷", title: "Subcontractor Management", desc: "Invite subbies to see their jobs, log their time and submit costs — without giving them full access." },
  { icon: "💰", title: "Payments & Margin Tracking", desc: "Know exactly what you're making on every job. Connect Stripe and get paid online instantly." },
  { icon: "📊", title: "BAS & Financial Reports", desc: "GST, BAS and ATO reports generated automatically from your real data. No manual spreadsheets." },
];

const painPoints = [
  { icon: "📝", title: "Quoting takes too long", desc: "Writing up quotes by hand, forgetting to include stuff, underselling your work. Sound familiar?" },
  { icon: "😤", title: "Chasing payments is embarrassing", desc: "You did the job. You deserve to get paid. Mustered sends automatic reminders so you don't have to." },
  { icon: "📅", title: "Scheduling is a mess", desc: "Texts, phone calls, paper diaries. Your team doesn't know where to be and neither do you." },
];

const steps = [
  { num: "1", title: "Create your account", desc: "Sign up, tell us about your business — tradie, farmer or small business — and Mustered sets itself up for you." },
  { num: "2", title: "Add your jobs and team", desc: "Add your customers, properties and staff. Start scheduling jobs straight away." },
  { num: "3", title: "Quote, invoice and get paid", desc: "Send professional quotes, convert to invoices and collect payment — all from your phone on site." },
];

const audiences = [
  { icon: "🔧", title: "Tradies", desc: "Electricians, plumbers, builders, painters, HVAC techs, fencers — if you go to a job site, Mustered has got your back.", bg: "bg-blue-50" },
  { icon: "🌾", title: "Farmers & Agricultural Businesses", desc: "Manage work across your property, paddocks and sheds. Track contractors, chemicals and seasonal jobs — all in one place.", bg: "bg-green-50" },
  { icon: "🏪", title: "Small Businesses", desc: "Manage your team, bookings and customers without the corporate software price tag. Simple, honest, Australian.", bg: "bg-orange-50" },
];


const priceFeatures = [
  "Unlimited jobs and invoices",
  "Unlimited customers and contacts",
  "Scheduling and calendar",
  "Properties and sub-locations",
  "Subcontractor portal access",
  "Stripe payment integration",
  "GST, BAS and financial reports",
  "Bank reconciliation",
  "Mobile optimised — works on any device",
  "Australian support",
];

const testimonials = [
  { quote: "I used to spend Sunday nights doing invoices. Now I send them from the van before I've even packed up my tools.", name: "Jake T", role: "Electrician, Perth WA", initial: "J" },
  { quote: "Finally something that understands how a farm actually works. I can track every paddock, every contractor, every job.", name: "Sarah M", role: "Mixed Farmer, Northam WA", initial: "S" },
  { quote: "My accountant actually rang me to ask what I'd changed. Mustered just makes everything cleaner.", name: "Dave R", role: "Plumber, Bunbury WA", initial: "D" },
];

export default function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".fade-in").forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-card">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-4 bg-card/92 backdrop-blur-xl border-b border-border/80">
        <Link to="/" className="font-serif text-xl font-black text-primary tracking-tight">
          Mustered
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
          <a href="#who-its-for" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Who it's for</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How it works</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
          <Link to="/auth?mode=signin" className="text-sm font-bold text-primary bg-secondary border border-primary/20 rounded-md px-4 py-2.5 hover:bg-secondary/80 transition-colors">
            Mustered Login
          </Link>
          <Link to="/auth?mode=signup" className="text-sm font-bold bg-primary text-primary-foreground rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity">
            Start free 14-day trial
          </Link>
        </div>
        <Link to="/auth?mode=signin" className="md:hidden text-sm font-bold text-primary bg-secondary border border-primary/20 rounded-md px-4 py-2.5">
            Mustered Login
          </Link>
      </nav>

      {/* HERO */}
      <section className="pt-[140px] pb-20 px-6 lg:px-10 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-primary/[0.08] rounded-full blur-3xl" />
        <div className="absolute -bottom-[100px] -left-[100px] w-[400px] h-[400px] bg-accent/[0.07] rounded-full blur-3xl" />

        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="fade-in">
            <div className="inline-flex items-center gap-2 bg-secondary text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              <span className="w-2 h-2 bg-primary rounded-full inline-block" />
              Built for Australian businesses
            </div>
            <h1 className="text-4xl lg:text-[54px] leading-[1.1] font-black text-foreground mb-5 tracking-tight">
              Run your trade business <em className="not-italic text-primary">from your phone</em>
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground font-light mb-9">
              Quote, schedule, invoice and get paid — all in one place. Built for Australian tradies, farmers and small businesses who'd rather be on the tools than buried in paperwork.
            </p>
            <div className="flex gap-3.5 flex-wrap items-center">
              <Link to="/auth?mode=signup" className="inline-flex items-center justify-center rounded-md font-semibold bg-primary text-primary-foreground px-8 py-4 text-base hover:opacity-90 transition-opacity">
                Start free 14-day trial
              </Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center rounded-md font-semibold bg-card text-primary border-2 border-primary px-7 py-3.5 text-sm hover:bg-secondary transition-colors">
                See how it works
              </a>
              <span className="w-full text-sm text-muted-foreground">No credit card required. No contracts. Cancel anytime.</span>
            </div>
          </div>

          <div className="relative fade-in" style={{ transitionDelay: "0.2s" }}>
            <div className="absolute -top-5 -right-5 bg-card rounded-md px-4 py-3 shadow-brand text-sm font-semibold flex items-center gap-2.5 text-green-700 animate-float-chip z-10">
              <span className="text-lg">✓</span> Invoice paid — $2,750.00
            </div>
            <div className="bg-card rounded-[20px] shadow-brand overflow-hidden animate-float border border-border">
              <div className="bg-primary p-4 flex items-center justify-between">
                <span className="text-primary-foreground font-bold text-sm">Invoice #INV-0042</span>
                <span className="text-primary-foreground/70 font-serif text-xl font-black">$2,750.00</span>
              </div>
              <div className="p-5">
                {[
                  { label: "Client", value: "Apex Solutions Pty Ltd" },
                  { label: "Status", value: "Paid", badge: "bg-green-100 text-green-800" },
                  { label: "Subtotal", value: "$2,500.00" },
                  { label: "GST (10%)", value: "$250.00", badge: "bg-teal-light text-accent" },
                  { label: "Safe to spend", value: "$1,843.00", green: true },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-border last:border-0 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    {row.badge ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.badge}`}>{row.value}</span>
                    ) : (
                      <span className={`font-semibold ${row.green ? "text-green-700" : "text-foreground"}`}>{row.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-5 -left-8 bg-card rounded-md px-4 py-3 shadow-brand text-sm font-semibold flex items-center gap-2.5 text-primary animate-float-chip z-10" style={{ animationDelay: "1.2s" }}>
              <span className="text-lg">📊</span> GST auto-calculated
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-4 px-6 lg:px-10 bg-background border-b border-border">
        <div className="max-w-[1100px] mx-auto flex flex-wrap justify-center items-center gap-4 md:gap-8 text-sm text-muted-foreground font-medium">
          <span>Built for Australian businesses</span>
          <span className="hidden md:inline text-border">·</span>
          <span>GST & BAS ready</span>
          <span className="hidden md:inline text-border">·</span>
          <span>Stripe payments</span>
          <span className="hidden md:inline text-border">·</span>
          <span>Bank reconciliation</span>
          <span className="hidden md:inline text-border">·</span>
          <span>ATO compliant</span>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-24 px-6 lg:px-10 bg-background">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="fade-in">
            <h2 className="text-3xl lg:text-[42px] font-black leading-tight text-foreground mb-4 tracking-tight">
              Still quoting from a notepad?<br />Chasing invoices by text?
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed font-light max-w-[560px] mx-auto mb-14">
              You're losing money every week to bad paperwork. Mustered fixes that.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {painPoints.map((p, i) => (
              <div key={p.title} className="bg-secondary rounded-[20px] p-8 text-left fade-in" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="text-3xl mb-4">{p.icon}</div>
                <h3 className="text-lg font-bold mb-2.5 text-foreground">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 lg:px-10" id="features">
        <div className="max-w-[1100px] mx-auto">
          <div className="fade-in text-center">
            <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">Features</p>
            <h2 className="text-3xl lg:text-[42px] font-black leading-tight text-foreground mb-4 tracking-tight">
              Everything you need. <em className="not-italic text-primary">Nothing you don't.</em>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed font-light max-w-[600px] mx-auto">
              Mustered is the all-in-one business tool built specifically for tradies, farmers and small businesses across Australia.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {features.map((f, i) => (
              <div key={f.title} className="bg-card border border-border rounded-[20px] p-8 hover:border-primary hover:-translate-y-1 hover:shadow-brand transition-all cursor-default fade-in" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="w-[52px] h-[52px] rounded-md flex items-center justify-center text-2xl mb-5 bg-secondary">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2.5 text-foreground font-sans">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 lg:px-10 bg-background" id="how-it-works">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="fade-in">
            <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">How it works</p>
            <h2 className="text-3xl lg:text-[42px] font-black leading-tight text-foreground tracking-tight">
              Up and running in <em className="not-italic text-primary">minutes</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14">
            {steps.map((s, i) => (
              <div key={s.num} className="text-center fade-in" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-serif text-xl font-black flex items-center justify-center mx-auto mb-5">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-2.5 text-foreground font-sans">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-24 px-6 lg:px-10" id="who-its-for">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="fade-in">
            <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">Who it's for</p>
            <h2 className="text-3xl lg:text-[42px] font-black leading-tight text-foreground mb-14 tracking-tight">
              Built for the people who <em className="not-italic text-primary">build Australia</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audiences.map((a, i) => (
              <div key={a.title} className={`${a.bg} rounded-[20px] p-8 text-left fade-in`} style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-4">{a.icon}</div>
                <h3 className="text-lg font-bold mb-2.5 text-foreground">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-6 lg:px-10 bg-background" id="pricing">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="fade-in">
            <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">Pricing</p>
            <h2 className="text-3xl lg:text-[42px] font-black text-foreground">Simple, honest pricing</h2>
            <p className="text-base text-muted-foreground font-light mt-4 max-w-[560px] mx-auto">Start free for 14 days. No credit card required. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 items-stretch">
            {tiers.map((tier) => (
              <div
                key={tier.key}
                className={`relative bg-card rounded-[20px] p-8 text-left fade-in flex flex-col ${
                  tier.recommended
                    ? "border-2 border-primary shadow-brand md:scale-105 z-10"
                    : "border border-border"
                }`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wide">
                    Most popular
                  </div>
                )}
                <h3 className="text-xl font-black text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-5">{tier.tag}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-[42px] font-black text-primary leading-none">${tier.price}</span>
                  <span className="text-sm text-muted-foreground">/month inc. GST</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-foreground mb-3">Included:</div>
                <ul className="grid gap-2 mb-4">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-foreground">
                      <span className="text-accent font-extrabold flex-shrink-0 mt-0.5">✓</span>
                      <span>
                        {f}
                        {tier.comingSoon?.some((c) => f.toLowerCase().includes(c.toLowerCase())) && (
                          <span className="inline-block ml-1.5 bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {tier.locked && tier.locked.length > 0 && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Not included:</div>
                    <ul className="grid gap-1.5 mb-4">
                      {tier.locked.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground/60">
                          <span className="text-xs">🔒</span> {f}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mt-auto">
                  <Link
                    to="/auth?mode=signup"
                    className={`w-full flex justify-center items-center py-3.5 px-6 rounded-md font-bold text-sm ${
                      tier.recommended
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-primary border border-primary/20"
                    }`}
                  >
                    Start free trial
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6 fade-in">
            Already have an account?{" "}
            <Link to="/auth?mode=signin" className="text-primary font-bold hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 lg:px-10 bg-navy" id="testimonials">
        <div className="max-w-[1100px] mx-auto">
          <div className="fade-in text-center">
            <p className="text-xs font-bold tracking-[2px] uppercase text-indigo-300 mb-4">Testimonials</p>
            <h2 className="text-3xl lg:text-[42px] font-black text-navy-foreground">Aussie businesses love Mustered</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {testimonials.map((t, i) => (
              <div key={t.name} className="bg-primary-foreground/[0.07] border border-primary-foreground/10 rounded-[20px] p-8 fade-in" style={{ transitionDelay: `${i * 0.15}s` }}>
                <p className="text-[15px] leading-relaxed text-slate-300 mb-6 font-light italic">"{t.quote}"</p>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center font-serif text-lg font-black text-primary-foreground">
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy-foreground">{t.name}</div>
                    <div className="text-sm text-slate-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 lg:px-10 text-center" style={{ background: "var(--gradient-cta)" }}>
        <div className="fade-in">
          <h2 className="font-serif text-3xl lg:text-5xl font-black text-primary-foreground mb-4 tracking-tight">
            Ready to get your business mustered?
          </h2>
          <p className="text-lg text-primary-foreground/70 font-light mb-10">
            Join Australian tradies, farmers and small businesses already saving hours every week.
          </p>
          <Link to="/auth?mode=signup" className="inline-block bg-card text-primary px-10 py-4 text-base font-bold rounded-md hover:-translate-y-0.5 hover:shadow-brand transition-all">
            Start your free 14-day trial
          </Link>
          <p className="text-sm text-primary-foreground/50 mt-4">No credit card. No contracts. No dramas.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-foreground text-slate-400 py-12 px-6 lg:px-10 text-center">
        <div className="font-serif text-xl font-black text-card mb-2">Mustered</div>
        <p className="text-sm leading-relaxed mb-1">Built in Australia for Australian businesses</p>
        <p className="text-xs text-slate-500 mb-5">
          ABN reporting · GST ready · ATO compliant · Stripe payments
        </p>
        <div className="flex justify-center gap-6 flex-wrap">
          <Link to="/" className="text-sm text-slate-500 hover:text-card transition-colors">Home</Link>
          <a href="#features" className="text-sm text-slate-500 hover:text-card transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-slate-500 hover:text-card transition-colors">Pricing</a>
          <Link to="/auth?mode=signin" className="text-sm text-slate-500 hover:text-card transition-colors">Mustered Login</Link>
        </div>
        <p className="text-xs text-slate-600 mt-6">© {new Date().getFullYear()} Mustered. All rights reserved.</p>
      </footer>
    </div>
  );
}
