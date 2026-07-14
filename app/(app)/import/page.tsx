import { getCurrentMember } from "@/lib/db/members";
import { getProfile } from "@/lib/profile/v1/store";
import { ImportPortrait } from "@/components/app/ImportPortrait";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const member = await getCurrentMember();
  const profile = await getProfile(member.id);

  return (
    <section className="screen on">
      <div className="eyebrow rise">Import</div>
      <h1 className="mb-2 font-display text-2xl text-[var(--text)]">
        Bring in your profile
      </h1>
      <p className="mb-6 max-w-2xl text-[var(--t-dim)]">
        Soultech reads a self-portrait your existing ChatGPT or Claude can already write,
        a structured model of how you communicate, think, and learn. Copy the prompt, run
        it wherever you chat today, and paste the result back. No integrations or
        permissions needed.
      </p>
      <ImportPortrait initialProfile={profile} />
    </section>
  );
}
