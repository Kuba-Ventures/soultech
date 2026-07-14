import Link from "next/link";
import { ChatMockup } from "@/components/ChatMockup";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export default function Page() {
  return (
    <main className="relative">
      <SiteHeader />
      <Hero />
      <Waitlist />
      <SiteFooter />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative bg-glow">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 grid lg:grid-cols-2 gap-14 items-center">
        <div className="animate-fade-up">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-[-0.03em] leading-[0.98]">
            An AI that learns
            <br />
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              how you learn.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/65 leading-relaxed">
            Soultech imports a structured, ten-category model of how you
            communicate, think, and learn from the ChatGPT or Claude you already
            use. It sits behind every answer, so the reasoning actually makes
            sense to you.
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
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-full hairline text-white/80 px-5 py-3 text-sm hover:text-white hover:border-white/20 transition"
            >
              See how it works
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center px-3 py-3 text-sm text-white/55 hover:text-white transition"
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="lg:pl-8 animate-fade-up [animation-delay:120ms]">
          <ChatMockup />
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
            We&rsquo;re inviting a small group to import their profile first and tell us
            what the model gets wrong.
          </p>
        </div>

        <div className="mt-10">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
