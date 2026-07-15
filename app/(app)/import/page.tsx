import { getCurrentMember } from "@/lib/db/members";
import { getSourcesWithCounts } from "@/lib/profile/v1/store";
import { connectionsConfigured } from "@/lib/connections/crypto";
import { getConnectionStatus } from "@/lib/connections/store";
import { blobConfigured } from "@/lib/uploads/userFiles";
import { SourcesManager } from "@/components/app/SourcesManager";

export const dynamic = "force-dynamic";
// Room for synchronous paste/upload parsing and the background Notion pull.
export const maxDuration = 120;

export default async function ImportPage() {
  const member = await getCurrentMember();
  const sources = await getSourcesWithCounts(member.id);
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
        Everything Soultech learns from, in one place. Import from your AI, upload
        documents, connect a tool, or add your own. Each source is yours to add or remove
        anytime.
      </p>
      <SourcesManager
        initialSources={sources}
        notionEnabled={notionEnabled}
        notionConnected={notion.connected}
        storesFiles={blobConfigured()}
      />
    </section>
  );
}
