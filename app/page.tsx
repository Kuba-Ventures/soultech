import Link from "next/link";
import { brand } from "@/lib/brand";
import { ChatMockup } from "@/components/ChatMockup";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Logo } from "@/components/Logo";

export default function Page() {
  return (
    <main className="relative">
      <Header />
      <Hero />
      <HowItWorks />
      <UseCases />
      <Waitlist />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-ink/70 hairline-b">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="#" className="flex items-center gap-2">
          <Logo height={22} />
          <span className="sr-only">{brand.name}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/70">
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#cases" className="hover:text-white transition hidden sm:inline">Use cases</a>
          <a
            href="#waitlist"
            className="rounded-full bg-white text-black px-3.5 py-1.5 text-sm font-medium hover:bg-white/90 transition"
          >
            Join waitlist
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative bg-glow">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 grid lg:grid-cols-2 gap-14 items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-xs text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            Private beta — Spring 2026
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-medium tracking-[-0.03em] leading-[0.98]">
            An AI that learns
            <br />
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              how you learn.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/65 leading-relaxed">
            Train a personal AI on your voice, your thinking, your style.
            Get unstuck faster — in a way that actually makes sense to you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 transition"
            >
              Join the waitlist
              <svg className="ml-1.5 -mr-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-full hairline text-white/80 px-5 py-3 text-sm hover:text-white hover:border-white/20 transition"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="lg:pl-8 animate-fade-up [animation-delay:120ms]">
          <ChatMockup />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Record",
      body: "Quick voice conversations train your AI on how you think — your metaphors, your pacing, the analogies that click.",
      icon: MicIcon,
    },
    {
      n: "02",
      title: "Connect",
      body: "Optionally link email, calendar, and social for deeper context. Your data stays yours — nothing leaves without permission.",
      icon: LinkIcon,
    },
    {
      n: "03",
      title: "Learn",
      body: "Ask anything. Answers arrive in your own cognitive style — not a generic one, not a watered-down one.",
      icon: SparkIcon,
    },
  ];

  return (
    <section id="how" className="hairline-b">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">How it works</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
            Three steps to a partner that thinks with you.
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {steps.map(({ n, title, body, icon: Icon }) => (
            <div
              key={n}
              className="group relative rounded-2xl hairline bg-white/[0.02] p-6 hover:bg-white/[0.04] transition"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl hairline flex items-center justify-center text-white/80">
                  <Icon />
                </div>
                <span className="text-xs font-mono text-white/30">{n}</span>
              </div>
              <div className="mt-6 text-lg font-medium">{title}</div>
              <p className="mt-2 text-white/60 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    {
      title: "Get up to speed on a new topic, fast.",
      body: "Instead of grinding through a textbook, walk through it with an AI that already knows how you think.",
    },
    {
      title: "Work through a problem in your own voice.",
      body: "Talk it out. Your AI mirrors how you reason, surfaces what you&rsquo;re missing, and helps you converge.",
    },
    {
      title: "Turn passive learning into accelerated growth.",
      body: "Convert podcasts, papers, and meetings into compounding personal knowledge — phrased the way you&rsquo;d phrase it.",
    },
  ];

  return (
    <section id="cases" className="hairline-b">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">What it&rsquo;s for</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
            Built for the moments generic AI falls short.
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <article
              key={c.title}
              className="relative rounded-2xl hairline bg-gradient-to-b from-white/[0.04] to-transparent p-6 hover:from-white/[0.06] transition"
            >
              <div className="text-xs font-mono text-white/30">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3
                className="mt-3 text-xl font-medium tracking-tight leading-snug"
                dangerouslySetInnerHTML={{ __html: c.title }}
              />
              <p
                className="mt-3 text-white/60 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: c.body }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Waitlist() {
  return (
    <section id="waitlist" className="hairline-b">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Join</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
            Be early. Help shape it.
          </h2>
          <p className="mt-4 text-white/60">
            We&rsquo;re inviting a small group to train the first generation of personal AIs.
          </p>
        </div>

        <div className="mt-10">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 text-sm text-white/50">
        <div className="flex items-center gap-3">
          <Logo height={18} />
          <span className="text-white/30">·</span>
          <span>© {brand.year} {brand.name}. All rights reserved.</span>
        </div>
        <a
          href={`mailto:${brand.contactEmail}`}
          className="hover:text-white transition"
        >
          {brand.contactEmail}
        </a>
      </div>
    </footer>
  );
}

/* --- Inline icons (no library) ----------------------------------------- */

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
