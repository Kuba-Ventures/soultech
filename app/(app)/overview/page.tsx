import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/db/members";
import { getProfileCompleteness } from "@/lib/profile/completeness";
import { getOrGeneratePortrait } from "@/lib/profile/portrait";
import { listMemories } from "@/lib/db/memories";
import { listConnections } from "@/lib/db/tools";
import { CompletenessRing } from "@/components/overview/CompletenessRing";

export const dynamic = "force-dynamic";

const TYPE_KEY: Record<string, string> = {
  FACT: "Fact",
  PREFERENCE: "Preference",
  PLAN: "Plan",
  MEMORY: "Memory",
};

export default async function OverviewPage() {
  const member = await getCurrentMember();
  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    member.email.split("@")[0];
  const initial = (name.trim()[0] || "?").toUpperCase();

  const completeness = await getProfileCompleteness(member.id);
  const [portrait, allMemories, connections] = await Promise.all([
    getOrGeneratePortrait(member.id, completeness.memoryCount),
    listMemories(member.id, { limit: 100 }),
    listConnections(member.id),
  ]);

  const facts = allMemories
    .filter((m) => m.type === "FACT" || m.type === "PREFERENCE")
    .slice(0, 6);
  const activeConnections = connections.filter((c) => c.status === "active").length;
  const memberSince = new Date(member.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="screen on">
      <div className="eyebrow rise">Overview</div>

      <div className="pcard rise">
        <div className="big-av">{initial}</div>
        <div>
          <div className="nm">{name}</div>
          <div className="meta">
            Building since {memberSince} ·{" "}
            {completeness.isEmpty
              ? "nothing learned yet · no tools connected"
              : `${completeness.memoryCount} things learned · plugged into ${activeConnections} tool${activeConnections === 1 ? "" : "s"}`}
          </div>
        </div>
        <CompletenessRing percent={completeness.percent} />
      </div>

      <div className="summary rise">
        <div className="lab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5l3 2" />
          </svg>
          Who I think you are, so far
        </div>
        <p>
          {portrait ??
            "Nothing yet. I'm a blank slate. Teach me through a connection, a quick form, or a chat, and this fills in as a portrait of you."}
        </p>
        {portrait && (
          <div className="upd">↻ Rewrites itself every time you teach me something new.</div>
        )}
      </div>

      {facts.length > 0 && (
        <>
          <div className="sect">
            What I know<span className="ln" />
          </div>
          <div className="facts rise">
            {facts.map((f) => (
              <div className="fact" key={f.id}>
                <div className="k">{TYPE_KEY[f.type] ?? "Note"}</div>
                <div className="v">{f.contentSummary}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {completeness.gaps.length > 0 && (
        <>
          <div className="sect">
            To really know you, I still need<span className="ln" />
          </div>
          <div className="rise">
            {completeness.gaps.map((g) => (
              <div className="need" key={g.key}>
                <span className="dot" />
                <div className="nfo">
                  <div className="nm">{g.label}</div>
                  <div className="wy">{g.why}</div>
                </div>
                <div className="acts">
                  <Link className="mbtn go" href={g.href}>
                    Fill this in
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
