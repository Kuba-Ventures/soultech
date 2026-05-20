import { brand } from "@/lib/brand";

// Pure CSS, no JS. Static mockup of the AI in conversation.
export function ChatMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative rounded-2xl bg-ink-soft hairline overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 hairline-b">
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="ml-3 text-xs text-white/40 font-mono">
            {brand.name.toLowerCase()} · learning session
          </div>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-white/[0.06] px-4 py-2.5 text-white/90">
              How does a transformer actually <em>think</em>?
            </div>
          </div>

          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/10 hairline px-4 py-3 text-white/85">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                In your style: analogy first
              </p>
              <p>
                Picture a writers&rsquo; room where every editor reads the
                same page at once, each looking for a different pattern:
                rhyme, character arc, callbacks…
                <span className="inline-block w-1.5 h-4 align-[-2px] ml-0.5 bg-white/70 animate-type-cursor" />
              </p>
            </div>
          </div>

          <div className="flex justify-start">
            <div className="rounded-full bg-white/[0.04] hairline px-3 py-1.5 inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:200ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:400ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
