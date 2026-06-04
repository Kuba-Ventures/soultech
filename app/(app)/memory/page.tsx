import { ComingSoon } from "@/components/app/ComingSoon";

export const dynamic = "force-dynamic";

export default function MemoryPage() {
  return (
    <ComingSoon
      eyebrow="Memory"
      title="Everything saved about you."
      body="Typed records (facts, plans, memories, preferences) with redaction land in a later phase."
    />
  );
}
