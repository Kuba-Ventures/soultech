type ExchangeCardProps = {
  prompt: string;
  styleLabel: string;
  response: string;
};

// Mini chat exchange — mirrors the home hero ChatMockup pattern.
export function ExchangeCard({ prompt, styleLabel, response }: ExchangeCardProps) {
  return (
    <div className="relative">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="relative rounded-2xl bg-ink-soft hairline p-4 sm:p-5 space-y-3 text-sm">
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-white/[0.06] px-4 py-2.5 text-white/90">
            {prompt}
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/10 hairline px-4 py-3 text-white/85">
            <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
              {styleLabel}
            </p>
            <p className="leading-relaxed">{response}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
