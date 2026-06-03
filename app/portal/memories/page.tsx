import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { memories, type Memory } from "@/lib/db/schema";
import { getCurrentMember } from "@/lib/db/members";
import { MemoryList } from "@/components/portal/MemoryList";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const sourceTypes = ["chat", "upload_doc", "upload_audio", "voice_memo"] as const;
type SourceType = (typeof sourceTypes)[number];

function parseSource(value: string | undefined): SourceType | null {
  if (!value) return null;
  return (sourceTypes as readonly string[]).includes(value)
    ? (value as SourceType)
    : null;
}

type PageProps = {
  searchParams: Promise<{ source?: string; page?: string }>;
};

export default async function MemoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const source = parseSource(params.source);
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const member = await getCurrentMember();
  const db = getDb();

  const where = source
    ? and(eq(memories.memberId, member.id), eq(memories.sourceType, source))
    : eq(memories.memberId, member.id);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(memories)
      .where(where)
      .orderBy(desc(memories.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(memories).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="px-8 py-10 max-w-4xl">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Memories
          </div>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">
            Your brain.
          </h1>
          <p className="mt-2 text-sm text-white/55">
            {total} {total === 1 ? "memory" : "memories"}
            {source ? ` filtered by ${sourceLabel(source)}` : ""}.
          </p>
        </div>
        <Link
          href="/portal/upload"
          className="inline-flex items-center justify-center rounded-full bg-white text-black px-4 py-2 text-xs font-medium hover:bg-white/90 transition"
        >
          Upload sources
        </Link>
      </header>

      <div className="mt-6 flex gap-2 flex-wrap">
        <FilterChip label="All" href="/portal/memories" active={source === null} />
        {sourceTypes.map((s) => (
          <FilterChip
            key={s}
            label={sourceLabel(s)}
            href={`/portal/memories?source=${s}`}
            active={source === s}
          />
        ))}
      </div>

      <MemoryList
        memories={rows.map(serialize)}
        page={page}
        totalPages={totalPages}
        source={source}
      />
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs transition border ${
        active
          ? "bg-white text-black border-white"
          : "text-white/60 hover:text-white border-white/15 hover:border-white/30"
      }`}
    >
      {label}
    </Link>
  );
}

function sourceLabel(s: SourceType): string {
  return {
    chat: "Reflect chat",
    upload_doc: "Document",
    upload_audio: "Audio",
    voice_memo: "Voice memo",
  }[s];
}

function serialize(m: Memory) {
  return {
    id: m.id,
    sourceType: m.sourceType,
    content: m.content,
    contentSummary: m.contentSummary,
    createdAt: m.createdAt.toISOString(),
    redacted: m.redacted,
    redactionReason: m.redactionReason,
  };
}
