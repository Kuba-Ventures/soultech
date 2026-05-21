import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

export default async function PortalHome() {
  const user = await currentUser();
  const first = user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    <div className="px-8 py-12 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Welcome
      </div>
      <h1 className="mt-2 text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
        {first ? `Hello, ${first}.` : "Hello."}
      </h1>
      <p className="mt-4 text-white/60 leading-relaxed">
        Your clone needs a corpus before it can sound like you. Start by feeding
        it a few thoughts — five minutes is enough to feel the difference.
      </p>

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
          <div className="text-sm font-medium">View your corpus</div>
          <p className="mt-1 text-xs text-white/50 leading-relaxed">
            See every memory, edit summaries, redact what shouldn&rsquo;t be
            there.
          </p>
        </Link>
      </div>
    </div>
  );
}
