import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/db/members";
import { getOnboardingState } from "@/lib/onboarding/state";

export default async function PortalHome() {
  const member = await getCurrentMember();
  const state = await getOnboardingState(member.id);
  // First sign-in: bounce into onboarding before showing the home grid.
  if (!state) redirect("/portal/onboarding");

  const user = await currentUser();
  const first =
    user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0];
  const onboardingInProgress = state && !state.completedAt;

  return (
    <div className="px-8 py-12 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Welcome
      </div>
      <h1 className="mt-2 text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
        {first ? `Hello, ${first}.` : "Hello."}
      </h1>
      <p className="mt-4 text-white/60 leading-relaxed">
        Your clone learns from what you share. Start by teaching it a few
        things about you. Five minutes is enough to feel the difference.
      </p>

      {onboardingInProgress && (
        <Link
          href="/portal/onboarding"
          className="mt-6 inline-flex items-center justify-between gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] px-5 py-3 text-sm hover:border-amber-400/40 transition"
        >
          <span className="text-amber-200/90">
            Pick up where you left off in onboarding.
          </span>
          <span className="text-xs text-amber-200/70">Resume →</span>
        </Link>
      )}

      <div className="mt-10 grid sm:grid-cols-2 gap-4">
        <Link
          href="/portal/reflect"
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/15 transition"
        >
          <div className="text-sm font-medium">Start a reflection</div>
          <p className="mt-1 text-xs text-white/50 leading-relaxed">
            Open the AI Interviewer. Answer a few prompts. Each message becomes
            a memory.
          </p>
        </Link>
        <Link
          href="/portal/memories"
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/15 transition"
        >
          <div className="text-sm font-medium">Browse your memories</div>
          <p className="mt-1 text-xs text-white/50 leading-relaxed">
            See every memory, edit summaries, redact what shouldn&rsquo;t be
            there.
          </p>
        </Link>
      </div>
    </div>
  );
}
