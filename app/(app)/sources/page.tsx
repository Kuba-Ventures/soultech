import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/db/members";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { getSensitiveConsents } from "@/lib/profile/consent";
import { SourcesTabs } from "@/components/sources/SourcesTabs";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const member = await getCurrentMember();
  const consents = await getSensitiveConsents(member.id);

  const [m] = await getDb()
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, member.id))
    .limit(1);
  const settings = (m?.settings ?? {}) as Record<string, unknown>;
  const answers =
    (settings.questionnaires as Record<string, Record<string, string>>) ?? {};

  return (
    <section className="screen on">
      <div className="eyebrow rise">Sources</div>
      <h1 className="title rise">
        Here&rsquo;s how I <em>learn you.</em>
      </h1>
      <div className="lede rise">
        Three ways in: connect what you already use, answer a few short
        questions, or drop in anything personal.
      </div>
      <SourcesTabs initialConsents={consents} initialAnswers={answers} />
    </section>
  );
}
