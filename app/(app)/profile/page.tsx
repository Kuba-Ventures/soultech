import { currentUser } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/db/members";
import { getProfile } from "@/lib/profile/v1/store";
import { getOrGenerateSummary } from "@/lib/profile/v1/summary";
import { ProfileHub } from "@/components/app/ProfileHub";

export const dynamic = "force-dynamic";
// Room for the (cached) portrait generation on first load after an import.
export const maxDuration = 60;

export default async function ProfilePage() {
  const member = await getCurrentMember();
  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    member.email.split("@")[0];

  const profile = await getProfile(member.id);
  const summary = await getOrGenerateSummary(member.id, profile?.items ?? []);

  return (
    <section className="screen on">
      <div className="eyebrow rise">Your profile</div>
      <ProfileHub
        initialProfile={profile}
        name={name}
        portrait={summary?.portrait ?? null}
        traits={summary?.traits ?? []}
      />
    </section>
  );
}
