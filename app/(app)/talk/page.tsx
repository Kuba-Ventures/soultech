import { getCurrentMember } from "@/lib/db/members";
import { getProfile } from "@/lib/profile/v1/store";
import { styleTag } from "@/lib/compileProfile";
import { TalkChat } from "@/components/app/TalkChat";

export const dynamic = "force-dynamic";

export default async function TalkPage() {
  const member = await getCurrentMember();
  const profile = await getProfile(member.id);
  const hasProfile = (profile?.items.length ?? 0) > 0;

  return (
    <section className="screen on">
      <div className="eyebrow rise">Chat</div>
      <h1 className="mb-2 font-display text-2xl text-[var(--text)]">
        Talk to your second self
      </h1>
      <p className="mb-6 max-w-2xl text-[var(--t-dim)]">
        {hasProfile
          ? "Every answer is shaped by your profile. Edit your profile and it talks back differently."
          : "This chat gets sharper once you import a profile, but you can start now."}
      </p>
      <TalkChat tag={styleTag(profile)} hasProfile={hasProfile} />
    </section>
  );
}
