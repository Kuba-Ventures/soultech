import { getCurrentMember } from "@/lib/db/members";
import { getProfile } from "@/lib/profile/v1/store";
import { connectionsConfigured } from "@/lib/connections/crypto";
import { getConnectionStatus } from "@/lib/connections/store";
import { ImportPortrait } from "@/components/app/ImportPortrait";

export const dynamic = "force-dynamic";
// Room for the background Notion pull kicked off by connect via after().
export const maxDuration = 60;

export default async function ImportPage() {
  const member = await getCurrentMember();
  const profile = await getProfile(member.id);
  const notionEnabled = connectionsConfigured();
  const notion = notionEnabled
    ? await getConnectionStatus(member.id, "notion")
    : { connected: false };

  return (
    <section className="screen on">
      <div className="eyebrow rise">Sources</div>
      <h1 className="mb-2 font-display text-2xl text-[var(--text)]">
        Where your profile comes from
      </h1>
      <p className="mb-6 max-w-2xl text-[var(--t-dim)]">
        Feed Soultech what it learns from. Import a self-portrait your ChatGPT or Claude
        writes, and soon connect the tools where your writing and taste already live.
      </p>
      <ImportPortrait
        initialProfile={profile}
        notionEnabled={notionEnabled}
        notion={notion}
      />
    </section>
  );
}
