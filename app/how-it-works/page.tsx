import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: `How it works — ${brand.name}`,
  description: `How ${brand.shortName} learns the way you think.`,
};

export default function HowItWorksPage() {
  return (
    <main>
      <SiteHeader />
      <Intro />
      <Steps />
      <WhatItIsnt />
      <CTA />
      <SiteFooter />
    </main>
  );
}

function Intro() {
  return (
    <section className="bg-glow">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-16 text-center animate-fade-up">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">How it works</div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.05]">
          How it learns the way you think.
        </h1>
        <p className="mt-6 text-lg text-white/65 leading-relaxed">
          Four steps. Voice first, data optional, you in control of all of it.
        </p>
        <p className="mt-3 text-sm text-white/40">
          Local-first by default. Anything you connect is encrypted and revocable.
        </p>
      </div>
    </section>
  );
}

type Step = {
  index: string;
  title: string;
  body: string;
  icon: React.ReactNode;
};

const steps: Step[] = [
  {
    index: "01",
    title: "Train your voice",
    body:
      "Short conversational sessions teach Soultech the vocabulary you reach for, the analogies you keep using, and the way you structure an idea. You're not filling out a profile. You're talking, and it's listening for pattern.",
    icon: <WaveformIcon />,
  },
  {
    index: "02",
    title: "Connect what helps (optional)",
    body:
      "Plug in your calendar, docs, notes, or email if you want richer context. Connections are explicit and revocable. Your data stays encrypted and under your control — nothing leaves your account unless you say so.",
    icon: <NodesIcon />,
  },
  {
    index: "03",
    title: "Talk to a partner that thinks like you",
    body:
      "Ask anything. Explanations come back in your analogies, questions in the shape you'd frame them. Each session sharpens the model's read on how you actually reason.",
    icon: <ChatIcon />,
  },
  {
    index: "04",
    title: "It grows with you",
    body:
      "Your thinking shifts. The model shifts with it. As your vocabulary, references, and priorities evolve, Soultech notices and adjusts how it talks back.",
    icon: <GrowthIcon />,
  },
];

function Steps() {
  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 pb-12 sm:pb-16">
        <ol className="space-y-5 sm:space-y-6">
          {steps.map((step, i) => (
            <li
              key={step.index}
              className="rounded-2xl hairline bg-ink-soft/40 p-6 sm:p-8 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-5 sm:gap-7">
                <div className="shrink-0">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl hairline bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/10 flex items-center justify-center text-white/80">
                    {step.icon}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-mono">
                    Step {step.index}
                  </div>
                  <h2 className="mt-1.5 text-xl sm:text-2xl font-medium tracking-[-0.01em]">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-white/65 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WhatItIsnt() {
  const items = [
    {
      label: "Not a general chatbot.",
      body: "It learns from you, not from the average internet user.",
    },
    {
      label: "Not a notetaker or recorder.",
      body: "Soultech doesn't capture meetings. It captures how you think.",
    },
    {
      label: "Not an AI clone.",
      body: "A partner that reflects how you reason, not a copy of you.",
    },
  ];

  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40 text-center">
          What it isn&rsquo;t
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.label}
              className="rounded-2xl hairline p-5 bg-ink-soft/30"
            >
              <div className="text-white/90 font-medium">{it.label}</div>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="hairline-b">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
          Train one. See what it sounds like.
        </h2>
        <p className="mt-4 text-white/60">
          A small group is shaping the first generation now.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/#waitlist"
            className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 transition"
          >
            Join the waitlist
          </Link>
          <Link
            href="/use-cases"
            className="inline-flex items-center justify-center rounded-full hairline text-white/80 px-5 py-3 text-sm hover:text-white hover:border-white/20 transition"
          >
            See use cases
          </Link>
        </div>
      </div>
    </section>
  );
}

function WaveformIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="4" y1="12" x2="4" y2="12" />
      <line x1="8" y1="9" x2="8" y2="15" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="16" y1="8" x2="16" y2="16" />
      <line x1="20" y1="11" x2="20" y2="13" />
    </svg>
  );
}

function NodesIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M6.5 7.5L11 16.5" />
      <path d="M17.5 7.5L13 16.5" />
      <path d="M7 6h10" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h11a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H9l-4 3v-3a2 2 0 0 1-1-1.7V8a2 2 0 0 1 2-2h-2z" />
      <path d="M9 10.5h6" />
      <path d="M9 13h4" />
    </svg>
  );
}

function GrowthIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 18L9 13L13 16L20 8" />
      <path d="M15 8h5v5" />
    </svg>
  );
}
