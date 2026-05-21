"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInterviewerMessage } from "@/app/portal/reflect/actions";
import {
  askOnboardingQuestion,
  completeOnboardingAction,
  startOnboardingAction,
} from "@/app/portal/onboarding/actions";
import type { SeedQuestion } from "@/lib/onboarding/questions";

function findSeedIndex(seedId: string, questions: SeedQuestion[]): number {
  return questions.findIndex((q) => q.id === seedId);
}

type UIMessage = {
  id: string;
  role: "member" | "clone";
  content: string;
  createdAt: string;
};

type Props = {
  hasStarted: boolean;
  askedIndices: number[];
  memberMessageCount: number;
  minMessagesToComplete: number;
  questions: SeedQuestion[];
  initialMessages: UIMessage[];
};

export function OnboardingShell({
  hasStarted,
  askedIndices,
  memberMessageCount,
  minMessagesToComplete,
  questions,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"welcome" | "chat">(
    hasStarted ? "chat" : "welcome",
  );
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [memberMsgs, setMemberMsgs] = useState(memberMessageCount);
  const [asked, setAsked] = useState<number[]>(askedIndices);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== "chat") return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, stage]);

  // Auto-ask first question on entering chat stage if nothing asked yet.
  useEffect(() => {
    if (
      stage === "chat" &&
      asked.length === 0 &&
      messages.filter((m) => m.role === "clone").length === 0 &&
      !pending
    ) {
      askQuestion(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const nextUnaskedIndex = useMemo(() => {
    for (let i = 0; i < questions.length; i++) {
      if (!asked.includes(i)) return i;
    }
    return -1;
  }, [asked, questions.length]);

  const canFinish = memberMsgs >= minMessagesToComplete;

  function beginOnboarding() {
    startTransition(async () => {
      await startOnboardingAction();
      setStage("chat");
      router.refresh();
    });
  }

  function askQuestion(index: number) {
    startTransition(async () => {
      const result = await askOnboardingQuestion({ index });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const q = questions[index];
      setMessages((prev) => [
        ...prev,
        {
          id: `seed-${q.id}-${Date.now()}`,
          role: "clone",
          content: q.text,
          createdAt: new Date().toISOString(),
        },
      ]);
      setAsked((prev) => (prev.includes(index) ? prev : [...prev, index]));
      router.refresh();
    });
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || pending) return;
    const optimisticId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "member", content, createdAt: new Date().toISOString() },
    ]);
    setMemberMsgs((c) => c + 1);
    setDraft("");
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("content", content);
      fd.set("mode", "onboarding");
      const result = await sendInterviewerMessage(fd);
      if (!result.ok) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setMemberMsgs((c) => Math.max(0, c - 1));
        setDraft(content);
        return;
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        {
          id: result.member.id,
          role: "member",
          content: result.member.content,
          createdAt: result.member.createdAt.toString(),
        },
        {
          id: result.clone.id,
          role: "clone",
          content: result.clone.content,
          createdAt: result.clone.createdAt.toString(),
        },
      ]);
      // If the Interviewer advanced to a new seed inside its reply, mark it
      // asked locally so the sidebar updates without a hard refresh.
      if (result.advancedSeedId) {
        const idx = findSeedIndex(result.advancedSeedId, questions);
        if (idx >= 0) {
          setAsked((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
        }
      }
    });
  }

  function finish() {
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/portal");
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (stage === "welcome") {
    return (
      <div className="h-full overflow-y-auto px-8 py-16 max-w-2xl mx-auto">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Welcome
        </div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.05]">
          Let&rsquo;s teach the clone how you think.
        </h1>
        <p className="mt-5 text-white/65 leading-relaxed">
          Your clone learns from your own words. The richer the seed, the more
          it will sound like you and notice patterns you didn&rsquo;t. The next
          ten minutes are about feeding it a few honest answers, not finishing
          a quiz.
        </p>
        <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
          <Step
            n="1"
            title="Answer a few seeds"
            body="Ten short questions designed to capture voice, values, and the things you keep returning to."
          />
          <Step
            n="2"
            title="The Interviewer probes"
            body="It asks follow-ups, not advice. Each of your answers becomes a memory the clone can use later."
          />
          <Step
            n="3"
            title="Start a real chat"
            body="When you&rsquo;ve seeded enough, go to Chat and talk with a clone that already knows you."
          />
        </div>
        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            onClick={beginOnboarding}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition"
          >
            {pending ? "Starting…" : "Begin"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/portal")}
            className="text-xs text-white/40 hover:text-white/70"
          >
            Skip for now
          </button>
        </div>
        {error && <div className="mt-4 text-sm text-rose-400">{error}</div>}
      </div>
    );
  }

  // Chat stage.
  return (
    <div className="h-full flex flex-col">
      <header className="px-8 pt-8 pb-3 max-w-4xl">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Onboarding
            </div>
            <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">
              Seed the corpus.
            </h1>
          </div>
          <div className="text-xs text-white/45">
            {askedIndices.length} / {questions.length} questions ·{" "}
            {memberMsgs} {memberMsgs === 1 ? "answer" : "answers"}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_260px] max-w-4xl w-full gap-6 px-8 pb-2">
        <div className="min-h-0 flex flex-col rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-5 space-y-5"
          >
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {pending && (
              <div className="flex items-center gap-1.5 text-white/40 text-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:150ms]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:300ms]" />
              </div>
            )}
          </div>
          <div className="border-t border-white/8 p-3">
            {error && <div className="mb-2 text-xs text-rose-400">{error}</div>}
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-white/25 transition">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Answer honestly. Specific beats clean."
                disabled={pending}
                className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none min-h-[20px] max-h-[160px]"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={pending || !draft.trim()}
                className="shrink-0 inline-flex items-center justify-center rounded-full bg-white text-black px-3 py-1 text-xs font-medium hover:bg-white/90 disabled:opacity-40 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <aside className="lg:flex flex-col gap-3 text-sm hidden">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/45">
              Seed progress
            </div>
            <ul className="mt-3 space-y-1.5">
              {questions.map((q, idx) => {
                const isAsked = asked.includes(idx);
                return (
                  <li
                    key={q.id}
                    className={`flex items-center gap-2 text-xs ${
                      isAsked ? "text-white/45" : "text-white/70"
                    }`}
                  >
                    <span
                      className={`inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                        isAsked
                          ? "bg-emerald-400/80 border-emerald-400/80 text-[8px] text-black"
                          : "border-white/20"
                      }`}
                    >
                      {isAsked ? "✓" : ""}
                    </span>
                    <span className="truncate">{q.tag}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-white/35 leading-relaxed">
              The Interviewer picks the next seed for you when your answer
              lands. Keep going as long as it feels useful.
            </p>
          </div>

          <button
            type="button"
            onClick={finish}
            disabled={!canFinish || pending}
            title={
              canFinish
                ? "Move to your portal"
                : `Answer ${minMessagesToComplete - memberMsgs} more to finish.`
            }
            className="rounded-xl bg-white text-black px-3 py-2 text-xs font-medium hover:bg-white/90 disabled:opacity-30 transition"
          >
            {canFinish
              ? "I'm ready — go to portal"
              : `Answer ${Math.max(0, minMessagesToComplete - memberMsgs)} more to finish`}
          </button>

          {nextUnaskedIndex >= 0 && (
            <button
              type="button"
              onClick={() => askQuestion(nextUnaskedIndex)}
              disabled={pending}
              title="Skip ahead — usually the Interviewer advances on its own."
              className="rounded-xl border border-white/10 text-white/55 px-3 py-2 text-xs hover:text-white/80 hover:border-white/25 disabled:opacity-50 transition"
            >
              Skip to next seed
            </button>
          )}
        </aside>
      </div>

      {/* Mobile fallback for finish + next */}
      <div className="lg:hidden px-8 pb-6 flex items-center gap-3">
        {nextUnaskedIndex >= 0 && (
          <button
            type="button"
            onClick={() => askQuestion(nextUnaskedIndex)}
            disabled={pending}
            className="rounded-full border border-white/15 text-white/80 px-4 py-2 text-xs hover:text-white hover:border-white/30 transition"
          >
            Next question
          </button>
        )}
        <button
          type="button"
          onClick={finish}
          disabled={!canFinish || pending}
          className="rounded-full bg-white text-black px-4 py-2 text-xs font-medium disabled:opacity-30 transition"
        >
          {canFinish ? "Finish" : `Answer ${Math.max(0, minMessagesToComplete - memberMsgs)} more`}
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/40">
        Step {n}
      </div>
      <div className="mt-1 text-white/85 text-sm font-medium">{title}</div>
      <div className="mt-2 text-xs text-white/55 leading-relaxed">{body}</div>
    </div>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const isMember = message.role === "member";
  return (
    <div className={`flex ${isMember ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isMember
            ? "bg-white/[0.06] text-white/90 rounded-br-sm"
            : "bg-gradient-to-br from-indigo-500/12 to-fuchsia-500/8 border border-white/8 text-white/85 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
