import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const services = [
  {
    icon: "🚜",
    title: "Tractor & Harvester Valuations",
    description:
      "Comprehensive market-value assessments for tractors, headers, harvesters, and other primary machinery. Includes condition grading, hours-of-use analysis, and comparable sales data.",
  },
  {
    icon: "🔧",
    title: "Implements & Attachments",
    description:
      "Evaluations covering ploughs, seeders, sprayers, balers, and all bolt-on implements. Each report details wear, remaining service life, and current replacement cost.",
  },
  {
    icon: "🚛",
    title: "Trucks & Transport Equipment",
    description:
      "Valuations for farm trucks, trailers, grain bins on wheels, and livestock transport. Roadworthy status, compliance, and market positioning included.",
  },
  {
    icon: "🏗️",
    title: "Fixed Plant & Infrastructure",
    description:
      "Assessments of silos, augers, irrigation systems, sheds, and other fixed assets. Ideal for insurance, finance, or succession planning purposes.",
  },
  {
    icon: "📋",
    title: "Pre-Purchase Inspections",
    description:
      "Independent inspections before buying or selling farm equipment. Mitchell provides an unbiased written report covering mechanical, structural, and cosmetic condition.",
  },
  {
    icon: "📊",
    title: "Sale & Purchase Reports",
    description:
      "Detailed written reports to support buying or selling decisions. Includes market positioning, condition summary, and estimated value range.",
  },
];

const reasons = [
  { icon: "✅", text: "Independent & unbiased reporting" },
  { icon: "📍", text: "On-site inspections across the region" },
  { icon: "🔍", text: "Thorough mechanical & structural assessments" },
  { icon: "⚡", text: "Fast turnaround — typically 3–5 business days" },
];

export default function FarmEquipmentPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".fade-in").forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-card">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-4 bg-card/92 backdrop-blur-xl border-b border-border/80">
        <Link to="/" className="font-serif text-xl font-black text-primary tracking-tight">
          Sharon's Accounting Service
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/landing#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</Link>
          <Link to="/farm-equipment" className="text-sm font-bold text-primary transition-colors">Farm Equipment</Link>
          <Link to="/auth?mode=signin" className="text-sm font-bold text-primary bg-secondary border border-primary/20 rounded-md px-4 py-2.5 hover:bg-secondary/80 transition-colors">
            Sign in
          </Link>
          <Link to="/auth?mode=signup" className="text-sm font-bold bg-primary text-primary-foreground rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity">
            Get started
          </Link>
        </div>
        <Link to="/auth?mode=signin" className="md:hidden text-sm font-bold text-primary bg-secondary border border-primary/20 rounded-md px-4 py-2.5">
          Login
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
              Farm Equipment Assessments
            </div>
            <h1 className="text-4xl lg:text-[54px] leading-[1.1] font-black text-foreground mb-5 tracking-tight">
              Professional farm equipment <em className="not-italic text-primary">assessments</em>
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground font-light mb-9">
              Mitchell provides independent, on-site assessments for tractors, harvesters, implements, trucks, and fixed plant — helping farmers make informed decisions about their equipment.
            </p>
            <div className="flex gap-3.5 flex-wrap items-center">
              <a href="#contact" className="inline-flex items-center justify-center rounded-md font-semibold bg-primary text-primary-foreground px-8 py-4 text-base hover:opacity-90 transition-opacity">
                Request an evaluation
              </a>
              <a href="#services" className="inline-flex items-center justify-center rounded-md font-semibold bg-card text-primary border-2 border-primary px-7 py-3.5 text-sm hover:bg-secondary transition-colors">
                View services
              </a>
            </div>
          </div>

          <div className="relative fade-in" style={{ transitionDelay: "0.2s" }}>
            <div className="bg-card rounded-[20px] shadow-brand overflow-hidden border border-border p-8 text-center">
              <div className="text-7xl mb-4">👨‍🌾</div>
              <h2 className="font-serif text-3xl font-black text-foreground mb-2">Mitchell</h2>
              <p className="text-base text-primary font-semibold mb-4">Farm Equipment Assessor</p>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Extensive hands-on experience with agricultural machinery. Independent and thorough — every assessment backed by practical knowledge and real market awareness.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                {["Independent", "On-Site", "Practical"].map((tag) => (
                  <span key={tag} className="bg-teal-light text-accent rounded-full px-3.5 py-1 text-xs font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-24 px-6 lg:px-10" id="about">
        <div className="max-w-[1100px] mx-auto">
          <div className="fade-in">
            <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">About Mitchell</p>
            <h2 className="text-3xl lg:text-[42px] font-black leading-tight text-foreground mb-4 tracking-tight">
              Your trusted <em className="not-italic text-primary">equipment specialist</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-10 items-start fade-in">
            <div>
              <p className="text-[15px] text-muted-foreground leading-relaxed font-light mb-4">
                Mitchell is our specialist farm equipment assessor with extensive hands-on experience in agricultural machinery. He provides independent assessments for a wide range of farm equipment — from tractors and harvesters through to fixed plant and infrastructure.
              </p>
              <p className="text-[15px] text-muted-foreground leading-relaxed font-light">
                Whether you need a valuation for insurance, finance, buying, selling, or succession planning, Mitchell delivers thorough, well-documented reports that are trusted by lenders, insurers, and industry professionals across the region.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reasons.map((r) => (
                <div key={r.text} className="bg-card border border-border rounded-[16px] p-5 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{r.icon}</span>
                  <span className="text-sm font-medium text-foreground">{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24 px-6 lg:px-10 bg-background" id="services">
        <div className="max-w-[1100px] mx-auto">
          <div className="fade-in text-center">
            <p className="text-xs font-bold tracking-[2px] uppercase text-primary mb-4">Services</p>
            <h2 className="text-3xl lg:text-[42px] font-black leading-tight text-foreground tracking-tight">
              Assessment services by <em className="not-italic text-primary">Mitchell</em>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed font-light mt-4 max-w-[560px] mx-auto">
              Professional assessments and inspections for all types of farm equipment and agricultural assets.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {services.map((svc, i) => (
              <div
                key={svc.title}
                className="bg-card border border-border rounded-[20px] p-8 hover:border-primary hover:-translate-y-1 hover:shadow-brand transition-all cursor-default fade-in"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-[52px] h-[52px] rounded-md bg-secondary flex items-center justify-center text-2xl mb-5">
                  {svc.icon}
                </div>
                <h3 className="text-lg font-bold mb-2.5 text-foreground font-sans">{svc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{svc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / CONTACT */}
      <section className="py-24 px-6 lg:px-10 text-center" id="contact" style={{ background: "var(--gradient-cta)" }}>
        <div className="fade-in">
          <h2 className="font-serif text-3xl lg:text-5xl font-black text-primary-foreground mb-4 tracking-tight">
            Need a farm equipment assessment?
          </h2>
          <p className="text-lg text-primary-foreground/70 font-light mb-10 max-w-[600px] mx-auto">
            Get in touch to arrange an on-site inspection with Mitchell. He provides detailed written reports for buying, selling, or internal asset management purposes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:info@sharonogier.com?subject=Farm Equipment Evaluation Request"
              className="inline-flex items-center gap-2 bg-card text-primary px-8 py-4 text-base font-bold rounded-md hover:-translate-y-0.5 hover:shadow-brand transition-all"
            >
              📧 Email us
            </a>
            <a
              href="tel:"
              className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 px-8 py-4 text-base font-bold rounded-md hover:-translate-y-0.5 transition-all"
            >
              📞 Call us
            </a>
          </div>
          <p className="text-sm text-primary-foreground/50 mt-4">Typical turnaround: 3–5 business days</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-foreground text-slate-400 py-12 px-6 lg:px-10 text-center">
        <div className="font-serif text-xl font-black text-card mb-4">Sharon's Accounting Service</div>
        <p className="text-sm leading-relaxed">
          Smart accounting tools & farm equipment evaluations for Australian businesses.<br />
          ABN registered · Built in Australia · Data stored securely.
        </p>
        <div className="flex justify-center gap-6 mt-5 flex-wrap">
          <Link to="/" className="text-sm text-slate-500 hover:text-card transition-colors">Home</Link>
          <Link to="/landing" className="text-sm text-slate-500 hover:text-card transition-colors">Accounting Portal</Link>
          <Link to="/farm-equipment" className="text-sm text-slate-500 hover:text-card transition-colors">Farm Equipment</Link>
          <Link to="/auth?mode=signin" className="text-sm text-slate-500 hover:text-card transition-colors">Portal Login</Link>
        </div>
        <p className="text-xs text-slate-600 mt-6">© {new Date().getFullYear()} Sharon's Accounting Service. All rights reserved.</p>
      </footer>
    </div>
  );
}
