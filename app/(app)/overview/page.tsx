import { ComingSoon } from "@/components/app/ComingSoon";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <ComingSoon
      eyebrow="Overview"
      title="You, at a glance."
      body="The completeness ring, the self-rewriting summary, and the gaps to fill land in a later phase."
    />
  );
}
