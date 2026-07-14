import { getCurrentMember } from "@/lib/db/members";
import { getProfile } from "@/lib/profile/v1/store";
import { ProfileHub } from "@/components/app/ProfileHub";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const member = await getCurrentMember();
  const profile = await getProfile(member.id);

  return (
    <section className="screen on">
      <div className="eyebrow rise">Your profile</div>
      <h1 className="mb-2 font-display text-2xl text-[var(--text)]">Who you are</h1>
      <p className="mb-6 max-w-2xl text-[var(--t-dim)]">
        The structured model Soultech uses to calibrate to you, organized into ten
        categories. Every item shows where it came from. Edit anything that&apos;s off, add
        what&apos;s missing, and delete what you don&apos;t want it to know.
      </p>
      <ProfileHub initialProfile={profile} />
    </section>
  );
}
