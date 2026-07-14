import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/db/members";
import { getProfile, isOnboardingV1Done } from "@/lib/profile/v1/store";
import { OnboardingWizard } from "@/components/app/OnboardingWizard";

export const dynamic = "force-dynamic";

/**
 * First-run onboarding. Post-sign-in lands here; once the member has finished
 * or skipped the wizard (or already has a profile from before it existed), we
 * send them straight to the dashboard so this only shows on the first run.
 */
export default async function WelcomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const member = await getCurrentMember();
  const [done, profile] = await Promise.all([
    isOnboardingV1Done(member.id),
    getProfile(member.id),
  ]);

  if (done || (profile?.items.length ?? 0) > 0) {
    redirect("/profile");
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <OnboardingWizard initialCount={profile?.items.length ?? 0} />
    </main>
  );
}
