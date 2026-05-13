import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { SiteHeader, SiteFooter, ComingSoon } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: `How it works — ${brand.name}`,
  description: `A look at how ${brand.shortName} learns the way you think.`,
};

export default function HowItWorksPage() {
  return (
    <main>
      <SiteHeader />
      <ComingSoon
        eyebrow="How it works"
        title="A walkthrough is on the way."
        body="We're putting the finishing touches on a closer look at how Soultech learns the way you think — voice training, optional data connections, and the partner that comes out the other side."
      />
      <SiteFooter />
    </main>
  );
}
