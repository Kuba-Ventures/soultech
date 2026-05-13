import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { SiteHeader, SiteFooter, ComingSoon } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: `Use cases — ${brand.name}`,
  description: `What people are using ${brand.shortName} for.`,
};

export default function UseCasesPage() {
  return (
    <main>
      <SiteHeader />
      <ComingSoon
        eyebrow="Use cases"
        title="The stories are still being written."
        body="We're collecting the ways early users are putting Soultech to work — from ramping up on dense topics to thinking out loud through hard problems. Detailed cases coming soon."
      />
      <SiteFooter />
    </main>
  );
}
