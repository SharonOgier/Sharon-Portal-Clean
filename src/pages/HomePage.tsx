import { useState } from "react";
import { Link } from "react-router-dom";

const pages = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "farm-equipment", label: "Farm Equipment" },
  { id: "about", label: "About" },
  { id: "mustered", label: "Mustered", badge: true },
  { id: "why", label: "Why Sharon" },
  { id: "why-mitchell", label: "Why Mitchell" },
  { id: "contact", label: "Contact" },
];

const stats = [
  { title: "Based in Casino NSW", desc: "Serving Casino, Lismore, Ballina and surrounding Northern Rivers region." },
  { title: "Financial clarity", desc: "Reporting, structure and better business visibility." },
  { title: "Operational insight", desc: "Practical support grounded in real experience." },
  { title: "Now including Mustered", desc: "Our own business management platform — built for tradies, farmers and small business." },
  { title: "Built to be useful", desc: "Less chaos. Better systems. Clearer decisions." },
];

const services = [
  { num: "01", title: "Bookkeeping & BAS", desc: "Day-to-day books, bank reconciliation, GST tracking and quarterly BAS lodgement. Clean data, on time, every time." },
  { num: "02", title: "Invoicing & Accounts Receivable", desc: "Professional invoicing through the portal, payment tracking, follow-ups and aged receivables reporting." },
  { num: "03", title: "Financial Analysis & Reporting", desc: "Beyond compliance — Sharon analyses what the numbers mean. Profitability, cash flow trends, cost breakdowns and forward planning." },
  { num: "04", title: "Business Structure & Systems", desc: "Helping you set up or improve the financial systems that keep your business running smoothly." },
  { num: "05", title: "Portal Access for Clients", desc: "Every client gets access to the portal — invoices, expenses, documents and reports in one secure place." },
  { num: "06", title: "Farm & Small Business Specialist", desc: "Deep understanding of seasonal cash flow, equipment costs, livestock accounting and the financial realities of running a farm or small business." },
];

const musteredFeatures = [
  "Quote and invoice from your phone on site",
  "Schedule jobs and assign to staff or subcontractors",
  "Track work across properties, paddocks and job sites",
  "Subcontractor portal — they see their jobs, nothing else",
  "Stripe payments built in — get paid faster",
  "GST, BAS and financial reports ready to go",
  "Works for tradies, farmers and small businesses",
];

export default function HomePage() {
  const [activePage, setActivePage] = useState("home");

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-page)" }}>
      <div className="bg-primary text-primary-foreground py-2 px-6 flex justify-end items-center gap-6 text-sm font-semibold flex-wrap">
        <span>Sharon&apos;s Accounting Service</span>
        <span className="opacity-85">📍 Casino NSW &amp; surrounds</span>
        <a href="tel:1300017167" className="text-primary-foreground flex items-center gap-1">📞 1300 017 167</a>
        <a href="mailto:info@sharonogier.com" className="text-primary-foreground flex items-center gap-1">✉ info@sharonogier.com</a>
        <Link to="/landing" className="bg-primary-foreground/20 text-primary-foreground px-4 py-1 rounded-full font-extrabold">
          Mustered Login
        </Link>
      </div>

      <div className="max-w-[1380px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-6 bg-card border border-border rounded-xl p-4 flex flex-col gap-4 shadow-brand">
          <div className="rounded-[22px] p-4 text-primary-foreground text-center" style={{ background: "var(--gradient-brand)" }}>
            <img
              src="https://152367768-799925207664624360.preview.editmysite.com/uploads/1/5/2/3/152367768/logo_orig.png"
              alt="Sharon's Accounting Service logo"
              className="w-full max-w-[130px] mx-auto mb-3 rounded-md bg-primary-foreground/15 p-1"
            />
            <h2 className="text-base font-bold mb-1 font-serif">Sharon&apos;s Accounting Service</h2>
            <p className="text-sm opacity-90">Financial clarity and practical business insight for farms and small business. Creator of Mustered.</p>
            <p className="text-xs opacity-85 mt-2">📍 Casino NSW &amp; surrounds</p>
          </div>

          <nav className="grid gap-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`w-full border rounded-md p-3 text-left font-bold transition-colors relative ${
                  activePage === page.id
                    ? "bg-secondary border-primary/30 text-primary"
                    : "bg-card border-border text-foreground hover:bg-secondary hover:text-primary"
                }`}
              >
                {page.label}
                {page.badge && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    NEW
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="grid gap-3">
            <Link to="/landing" className="flex justify-center items-center w-full py-3 px-4 rounded-md font-extrabold bg-primary text-primary-foreground">
              Mustered Login
            </Link>
            <a
              href="https://calendly.com/sharonogier-info"
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-center items-center w-full py-3 px-4 rounded-md font-extrabold bg-card text-primary border border-border"
            >
              Book a Review
            </a>
          </div>
        </aside>

        <main className="min-w-0">
          {activePage === "home" && (
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-5 mb-5">
                <div className="bg-card border border-border rounded-xl shadow-brand p-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">
                    Bookkeeping, financial analysis &amp; business software — Casino NSW
                  </span>
                  <h1 className="text-3xl lg:text-5xl font-black leading-tight tracking-tight mb-4 text-foreground">
                    Sort your books. Understand your numbers. Run a better business.
                  </h1>
                  <p className="text-muted-foreground leading-relaxed mb-5">
                    Sharon handles the books, the BAS, the invoices and the reporting — and goes further to analyse what the numbers actually mean for your business. Plus we built Mustered — our own business management platform now available to tradies, farmers and small businesses across Australia.
                  </p>
                  <div className="flex gap-3 flex-wrap mb-5">
                    <Link to="/landing" className="inline-flex justify-center items-center px-6 py-3 rounded-md font-extrabold bg-primary text-primary-foreground">
                      Mustered Login
                    </Link>
                    <a
                      href="https://calendly.com/sharonogier-info"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex justify-center items-center px-6 py-3 rounded-md font-extrabold bg-card text-primary border border-border"
                    >
                      Book a Review
                    </a>
                    <Link
                      to="/auth?mode=signup"
                      className="inline-flex justify-center items-center px-6 py-3 rounded-md font-extrabold text-primary hover:text-primary/80 transition-colors"
                    >
                      Try Mustered free →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stats.map((stat) => (
                      <div key={stat.title} className="bg-card border border-border rounded-lg shadow-brand p-4">
                        <strong className="block text-primary text-sm font-bold mb-1">{stat.title}</strong>
                        <span className="text-muted-foreground text-sm">{stat.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl shadow-brand p-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">
                    Mustered — Business Management Platform
                  </span>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Your business. Mustered.</h3>
                  <p className="text-muted-foreground mb-4">Mustered brings your jobs, invoices, team, properties and payments into one connected place. Built for tradies, farmers and small businesses across Australia.</p>
                  <div className="p-3 bg-secondary/50 border border-border rounded-lg">
                    <div className="bg-card rounded-lg border border-border p-6 text-center">
                      <div className="text-4xl mb-3">📊</div>
                      <p className="text-muted-foreground text-sm">Invoices, expenses, clients, documents and financial reports — all in one secure portal.</p>
                      <Link to="/landing" className="inline-flex mt-4 px-5 py-2 rounded-md font-bold bg-primary text-primary-foreground text-sm">
                        Mustered →
                      </Link>
                    </div>
                  </div>
                  <Link
                    to="/auth?mode=signup"
                    className="inline-flex mt-4 px-5 py-2 rounded-md font-bold bg-primary text-primary-foreground text-sm"
                  >
                    Try Mustered free for 14 days →
                  </Link>
                  <p className="text-muted-foreground text-xs mt-2">$59/month. 14-day free trial. No credit card required.</p>
                </div>
              </div>

              <div className="bg-secondary/60 border border-primary/15 rounded-xl shadow-brand p-6 mb-5">
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-extrabold mb-4">
                  Introducing Mustered
                </span>
                <h2 className="text-2xl font-black mb-2 text-foreground">
                  We built the software we always wished existed.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  After years of working with tradies, farmers and small businesses, we knew exactly what was missing. So we built it. Mustered is now available to any Australian business — not just our clients.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {musteredFeatures.map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <span className="text-primary font-bold text-lg mt-0.5">✓</span>
                      <span className="text-foreground text-sm">{feat}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                  <Link to="/auth?mode=signup" className="inline-flex px-6 py-3 rounded-md font-extrabold bg-primary text-primary-foreground text-sm">
                    Try Mustered free for 14 days →
                  </Link>
                  <button
                    onClick={() => setActivePage("mustered")}
                    className="inline-flex px-6 py-3 rounded-md font-extrabold text-primary hover:text-primary/80 text-sm transition-colors"
                  >
                    Learn more about Mustered →
                  </button>
                </div>
                <p className="text-muted-foreground text-xs mt-2">$59/month. 14-day free trial. No credit card required.</p>
              </div>

              <div className="bg-card border border-border rounded-xl shadow-brand p-6 mb-5">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
                  <div className="w-[100px] h-[100px] rounded-full bg-secondary flex items-center justify-center text-5xl mx-auto md:mx-0">
                    👨‍🌾
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-3">
                      Farm Equipment Assessments — Northern Rivers NSW
                    </span>
                    <h3 className="text-xl font-black text-foreground mb-2">Mitchell — Equipment Assessor</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Mitchell provides independent assessments for tractors, harvesters, implements, trucks, and fixed plant. Thorough, practical reports to help you make informed equipment decisions.
                    </p>
                    <Link to="/farm-equipment" className="inline-flex px-5 py-2.5 rounded-md font-extrabold bg-primary text-primary-foreground text-sm">
                      View Services →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-6 text-primary-foreground shadow-brand mb-5" style={{ background: "var(--gradient-brand)" }}>
                <h3 className="text-lg font-bold mb-2 text-primary-foreground font-serif">Built for real Australian businesses — by someone who works with them every day.</h3>
                <p className="opacity-90 text-sm mb-3">
                  Sharon&apos;s Accounting Service has worked with tradies, farmers and small businesses across Northern NSW for years. Mustered was born from that experience — every feature designed around how Australian businesses actually work, not how corporate software thinks they should.
                </p>
                <p className="text-primary-foreground font-bold text-sm">
                  Accounting by Sharon. Software by Mustered.<br />
                  <span className="opacity-90 font-normal italic">Both built for you.</span>
                </p>
              </div>
            </section>
          )}

          {activePage === "services" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6 mb-5">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">What we do</span>
                <h2 className="text-3xl font-black mb-3 text-foreground">Services</h2>
                <p className="text-muted-foreground leading-relaxed">Bookkeeping, financial analysis, reporting and portal access — everything your business needs to stay on top of the numbers.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <div key={s.num} className="bg-card border border-border rounded-lg shadow-brand p-5">
                    <div className="w-11 h-11 grid place-items-center rounded-md bg-secondary text-primary font-extrabold mb-3">{s.num}</div>
                    <h3 className="text-lg font-bold mb-2 text-foreground font-sans">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activePage === "farm-equipment" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6 mb-5">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">Mitchell</span>
                <h2 className="text-3xl font-black mb-3 text-foreground">Farm Equipment Assessments</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Mitchell provides independent assessments for a wide range of farm equipment — from tractors and harvesters through to fixed plant and infrastructure. Thorough, practical reports to support your equipment decisions.
                </p>
                <Link to="/farm-equipment" className="inline-flex px-6 py-3 rounded-md font-extrabold bg-primary text-primary-foreground text-sm">
                  View Full Details →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: "🚜", title: "Tractor & Harvester Valuations", desc: "Market-value assessments including condition grading, hours-of-use analysis, and comparable sales data." },
                  { icon: "🔧", title: "Implements & Attachments", desc: "Evaluations for ploughs, seeders, sprayers, balers, and all bolt-on implements." },
                  { icon: "🚛", title: "Trucks & Transport", desc: "Valuations for farm trucks, trailers, grain bins, and livestock transport equipment." },
                  { icon: "🏗️", title: "Fixed Plant & Infrastructure", desc: "Silos, augers, irrigation systems, sheds, and other fixed assets." },
                  { icon: "📋", title: "Pre-Purchase Inspections", desc: "Independent inspections before buying or selling — mechanical, structural, and cosmetic." },
                  { icon: "📊", title: "Sale & Purchase Reports", desc: "Detailed reports to support buying or selling decisions with market positioning and condition summary." },
                ].map((svc) => (
                  <div key={svc.title} className="bg-card border border-border rounded-lg shadow-brand p-5">
                    <div className="text-2xl mb-3">{svc.icon}</div>
                    <h3 className="text-base font-bold mb-1 text-foreground font-sans">{svc.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{svc.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activePage === "about" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">About</span>
                <h2 className="text-3xl font-black mb-3 text-foreground">About Sharon&apos;s Accounting Service</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Sharon Ogier is a qualified accountant based in Casino, NSW. She provides bookkeeping, BAS lodgement, financial analysis and reporting for small businesses and farms across the Northern Rivers region.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  What sets Sharon apart is that she doesn&apos;t just process the numbers — she explains what they mean. Her clients get clarity on cash flow, profitability, and where their business is actually heading.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Every client gets access to the portal — a secure, purpose-built system for invoices, expenses, documents and financial reports. And now, Sharon has built Mustered — a business management platform available to tradies, farmers and small businesses across Australia.
                </p>
              </div>
            </section>
          )}

          {activePage === "mustered" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6 mb-5">
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-extrabold mb-4">
                  Mustered — Business Management Platform
                </span>
                <h2 className="text-3xl font-black mb-3 text-foreground">Your business. Mustered.</h2>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  After years of working with tradies, farmers and small businesses, we knew exactly what was missing. So we built it. Mustered brings your jobs, invoices, team, properties and payments into one connected place.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {musteredFeatures.map((feat) => (
                    <div key={feat} className="flex items-start gap-3 bg-secondary/50 rounded-md p-3">
                      <span className="text-primary font-bold text-lg">✓</span>
                      <span className="text-foreground text-sm">{feat}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Link to="/auth?mode=signup" className="inline-flex px-6 py-3 rounded-md font-extrabold bg-primary text-primary-foreground">
                    Try Mustered free for 14 days →
                  </Link>
                  <Link to="/landing" className="inline-flex px-6 py-3 rounded-md font-extrabold bg-card text-primary border border-border">
                    Mustered Login
                  </Link>
                </div>
                <p className="text-muted-foreground text-xs mt-3">$59/month. 14-day free trial. No credit card required.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: "🪖", title: "Tradies", desc: "Scheduling, dispatch, job costing, subcontractor management and fast invoicing on-site." },
                  { icon: "🚜", title: "Farmers", desc: "Location-based job tracking, seasonal tasks, contractor management and property mapping." },
                  { icon: "🏪", title: "Small Business", desc: "Staff rostering, recurring bookings, customer management and simple invoicing." },
                ].map((aud) => (
                  <div key={aud.title} className="bg-card border border-border rounded-lg shadow-brand p-5">
                    <div className="text-3xl mb-3">{aud.icon}</div>
                    <h3 className="text-lg font-bold mb-2 text-foreground font-sans">{aud.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{aud.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activePage === "why" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">Why choose us</span>
                <h2 className="text-3xl font-black mb-3 text-foreground">Why Sharon</h2>
                <div className="grid gap-4 mt-4">
                  {[
                    "Goes beyond compliance to explain what your numbers actually mean",
                    "Specialises in farms and small businesses in the Northern Rivers",
                    "Every client gets portal access — invoices, reports and documents in one place",
                    "Practical, no-nonsense approach grounded in real business experience",
                    "Combined financial and operational expertise with Mitchell's support",
                    "Built Mustered — our own business management platform for tradies, farmers and small business",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-3 bg-secondary/50 rounded-md p-4">
                      <span className="text-primary font-bold text-lg">✓</span>
                      <p className="text-foreground text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activePage === "why-mitchell" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6 mb-5">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">Why choose Mitchell</span>
                <h2 className="text-3xl font-black mb-3 text-foreground">Why Mitchell</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Mitchell brings extensive, hands-on knowledge of the farming and agriculture industry. With years of practical experience working with machinery across the Northern Rivers and beyond, he understands what equipment is worth — and why.
                </p>
                <div className="grid gap-4 mt-4">
                  {[
                    "Grew up around farming — understands the day-to-day reality of agricultural operations",
                    "Hands-on mechanical knowledge across tractors, harvesters, implements and fixed plant",
                    "Years of experience assessing equipment condition, wear and remaining service life",
                    "Understands seasonal pressures and how they affect equipment decisions",
                    "Thorough, independent reports trusted by lenders, insurers and industry professionals",
                    "On-site inspections — Mitchell comes to you, anywhere across the region",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-3 bg-secondary/50 rounded-md p-4">
                      <span className="text-primary font-bold text-lg">✓</span>
                      <p className="text-foreground text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl shadow-brand p-6 mb-5">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">Farm Equipment Assessments</span>
                <h3 className="text-2xl font-black mb-3 text-foreground">What Mitchell can assess</h3>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  Mitchell provides independent, on-site assessments for all types of farm equipment. Whether you&apos;re buying, selling, or managing your fleet — he delivers practical, well-documented reports.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: "🚜", title: "Tractors & Harvesters", desc: "Condition grading, hours-of-use analysis, and comparable market data for primary machinery." },
                    { icon: "🔧", title: "Implements & Attachments", desc: "Ploughs, seeders, sprayers, balers — wear assessment and remaining service life." },
                    { icon: "🚛", title: "Trucks & Transport", desc: "Farm trucks, trailers, grain bins, and livestock transport equipment." },
                    { icon: "🏗️", title: "Fixed Plant & Infrastructure", desc: "Silos, augers, irrigation systems, sheds and other fixed assets." },
                    { icon: "📋", title: "Pre-Purchase Inspections", desc: "Independent inspections before buying or selling — mechanical, structural, and cosmetic." },
                    { icon: "📊", title: "Sale & Purchase Reports", desc: "Detailed reports with market positioning, condition summary and estimated value range." },
                  ].map((svc) => (
                    <div key={svc.title} className="bg-card border border-border rounded-lg shadow-brand p-5">
                      <div className="w-11 h-11 grid place-items-center rounded-md bg-secondary text-2xl mb-3">{svc.icon}</div>
                      <h4 className="text-base font-bold mb-2 text-foreground font-sans">{svc.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{svc.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 text-primary-foreground shadow-brand" style={{ background: "var(--gradient-brand)" }}>
                <h3 className="text-lg font-bold mb-2 text-primary-foreground font-serif">Need a farm equipment assessment?</h3>
                <p className="opacity-90 text-sm mb-4">
                  Get in touch to arrange an on-site inspection with Mitchell. He provides detailed written reports for buying, selling, insurance, finance, or succession planning.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <a
                    href="mailto:info@sharonogier.com?subject=Farm Equipment Assessment Request"
                    className="inline-flex px-6 py-3 rounded-md font-extrabold bg-primary-foreground text-primary text-sm"
                  >
                    📧 Email us
                  </a>
                  <a
                    href="tel:1300017167"
                    className="inline-flex px-6 py-3 rounded-md font-extrabold bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 text-sm"
                  >
                    📞 1300 017 167
                  </a>
                  <Link to="/farm-equipment" className="inline-flex px-6 py-3 rounded-md font-extrabold bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 text-sm">
                    View Full Page →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {activePage === "contact" && (
            <section>
              <div className="bg-card border border-border rounded-xl shadow-brand p-6">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary text-primary text-sm font-extrabold mb-4">Contact</span>
                <h2 className="text-3xl font-black mb-3 text-foreground">Ready to tidy things up?</h2>
                <p className="text-muted-foreground mb-5">Start with a review, then build a better system from there.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg shadow-brand p-5">
                    <h3 className="text-lg font-bold mb-3 text-foreground font-sans">Get in touch</h3>
                    <div className="grid gap-3">
                      <div className="bg-secondary rounded-md p-3 text-foreground font-semibold text-sm">Email: info@sharonogier.com</div>
                      <div className="bg-secondary rounded-md p-3 text-foreground font-semibold text-sm">Phone: 1300 017 167</div>
                      <div className="bg-secondary rounded-md p-3 text-foreground font-semibold text-sm">Location: Casino NSW and surrounding areas</div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg shadow-brand p-5">
                    <h3 className="text-lg font-bold mb-3 text-foreground font-sans">Next step</h3>
                    <p className="text-muted-foreground text-sm mb-4">Use the booking link for a review or head straight into the portal if you are already a client.</p>
                    <div className="flex gap-3 flex-wrap">
                      <a href="https://calendly.com/sharonogier-info" target="_blank" rel="noopener noreferrer" className="inline-flex px-5 py-2.5 rounded-md font-bold bg-primary text-primary-foreground text-sm">
                        Book a Review
                      </a>
                      <Link to="/landing" className="inline-flex px-5 py-2.5 rounded-md font-bold bg-card text-primary border border-border text-sm">
                        Mustered Login
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
