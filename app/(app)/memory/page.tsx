import { getCurrentMember } from "@/lib/db/members";
import { listMemories } from "@/lib/db/memories";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemoryBrowser, type MemoryItem } from "@/components/memory/MemoryBrowser";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  chat: "Chat",
  upload_doc: "Document",
  upload_audio: "Audio",
  voice_memo: "Voice memo",
};

const MEMORY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 12l4-2M12 12v4" />
  </svg>
);

export default async function MemoryPage() {
  const member = await getCurrentMember();
  const rows = await listMemories(member.id, {
    includeRedacted: true,
    limit: 200,
  });

  const items: MemoryItem[] = rows.map((m) => ({
    id: m.id,
    type: m.type,
    body: m.content,
    source: SOURCE_LABEL[m.sourceType] ?? m.sourceType,
    date: new Date(m.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    redacted: m.redacted,
  }));

  return (
    <section className="screen on">
      <div className="eyebrow rise">Memory</div>
      <h1 className="title rise">
        Everything <em>saved about you.</em>
      </h1>
      <div className="lede rise" style={{ marginBottom: 22 }}>
        Facts, plans, and memories the clone draws on. Redact anything and it
        forgets.
      </div>

      {items.length > 0 ? (
        <MemoryBrowser items={items} />
      ) : (
        <EmptyState
          icon={MEMORY_ICON}
          title="Nothing saved yet."
          body="Chat with your clone or connect a source, and the facts, plans, and memories it learns about you show up here, each one editable and removable."
          actions={[
            { label: "Add a source", href: "/sources" },
            { label: "Start a chat", href: "/chat", ghost: true },
          ]}
        />
      )}
    </section>
  );
}
