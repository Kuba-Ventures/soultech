import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ExchangeCard } from "@/components/ExchangeCard";

export const metadata: Metadata = {
  title: `Use cases: ${brand.name}`,
  description: `Ways people are using ${brand.shortName} to learn and think.`,
};

type UseCase = {
  title: string;
  bestFor: string;
  problem: string;
  prompt: string;
  styleLabel: string;
  response: string;
};

const useCases: UseCase[] = [
  {
    title: "Learning a new field fast",
    bestFor: "Researcher",
    problem: "I'm three papers deep into a field that isn't mine, and I keep losing the thread.",
    prompt: "What's actually going on with mechanistic interpretability, the core idea, not the jargon?",
    styleLabel: "In your style: analogy first",
    response:
      "Think of a neural net the way you think of a city you've only seen on a map. Interpretability is the work of walking the streets, checking which buildings actually do what the labels claim. Once you've walked enough blocks, the map starts meaning something.",
  },
  {
    title: "A hard conversation or decision",
    bestFor: "Founder",
    problem: "I've been chewing on this for two days and I keep arguing both sides in my head.",
    prompt: "I think I need to let go of my first engineer. Help me think through it.",
    styleLabel: "In your style: the question under the question",
    response:
      "You usually don't ask 'should I do this.' You ask 'what am I avoiding by asking.' What's the version of this where you've already made the call, and you're just looking for permission to feel okay about it?",
  },
  {
    title: "Getting unstuck on a creative project",
    bestFor: "Writer or maker",
    problem: "The shape of the thing is clear in my head and dead on the page.",
    prompt: "The middle of this essay is sagging. I don't know what's missing.",
    styleLabel: "In your style: diagnose before prescribing",
    response:
      "When your middles sag, it's almost always because the opening question already got answered and the reader knows it. You haven't given them a new tension yet. What's the second question this essay opens, the one you haven't asked out loud?",
  },
  {
    title: "Noticing patterns in your own thinking",
    bestFor: "Lifelong learner",
    problem: "I want to know what I actually believe, not what I said in passing on a Tuesday.",
    prompt: "Where have I quietly changed my mind in the last six months?",
    styleLabel: "In your style: surface the shifts you didn't announce",
    response:
      "Twice in March you described risk as 'optionality.' By April you stopped. You started calling it 'exposure.' That's not a vocabulary change. That's you deciding the downside matters more than you used to admit.",
  },
  {
    title: "Onboarding into a new role",
    bestFor: "New hire or career switcher",
    problem: "Everyone's speaking shorthand. I'm nodding along and falling a little further behind each day.",
    prompt: "Why do people on this team keep saying 'we need to raise the bar on rigor'?",
    styleLabel: "In your style: translate the in-group phrase",
    response:
      "It's not really about quality. It's a signal that someone shipped something half-thought-through, and the team is protecting itself out loud. Listen for who they're talking past when they say it. That's where the real disagreement lives.",
  },
  {
    title: "The 'explain it like I'm me' rabbit hole",
    bestFor: "Anyone who Googles too much",
    problem: "I've read six explanations of the same thing and none of them land.",
    prompt: "Explain Bayesian updating one more time. But actually.",
    styleLabel: "In your style: the version you'd tell yourself",
    response:
      "You already do this when you change your mind mid-conversation. Someone says something new, you don't throw out everything you believed. You just shift the weights a little. Bayesian updating is the math version of that small honest move.",
  },
];

export default function UseCasesPage() {
  return (
    <main>
      <SiteHeader />
      <Intro />
      <Cards />
      <CTA />
      <SiteFooter />
    </main>
  );
}

function Intro() {
  return (
    <section className="bg-glow">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-16 text-center animate-fade-up">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Use cases</div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.05]">
          What people are using it for.
        </h1>
        <p className="mt-6 text-lg text-white/65 leading-relaxed">
          Soultech is built for learning and thinking, not task management. A
          handful of the shapes that work well so far.
        </p>
        <p className="mt-3 text-sm text-white/40">
          Everything you train stays yours. Encrypted, revocable, and never used
          to train anyone else's model.
        </p>
      </div>
    </section>
  );
}

function Cards() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
          {useCases.map((uc, i) => (
            <article
              key={uc.title}
              className="rounded-2xl hairline bg-ink-soft/40 p-6 sm:p-7 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.01em]">
                  {uc.title}
                </h2>
                <span className="shrink-0 rounded-full hairline px-2.5 py-1 text-[11px] text-white/60">
                  {uc.bestFor}
                </span>
              </div>

              <p className="mt-3 text-sm text-white/55 italic leading-relaxed">
                &ldquo;{uc.problem}&rdquo;
              </p>

              <div className="mt-5">
                <ExchangeCard
                  prompt={uc.prompt}
                  styleLabel={uc.styleLabel}
                  response={uc.response}
                />
              </div>
            </article>
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
          Bring your own way of thinking.
        </h2>
        <p className="mt-4 text-white/60">
          The private beta is small on purpose. Early users help shape what this
          becomes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/#waitlist"
            className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 transition"
          >
            Join the waitlist
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center justify-center rounded-full hairline text-white/80 px-5 py-3 text-sm hover:text-white hover:border-white/20 transition"
          >
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}
