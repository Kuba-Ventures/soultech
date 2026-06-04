import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/db/members";
import { getProfileCompleteness } from "@/lib/profile/completeness";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const member = await getCurrentMember();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? member.email;
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined;
  const { percent } = await getProfileCompleteness(member.id);

  return (
    <AppShell email={email} name={name} percent={percent}>
      {children}
    </AppShell>
  );
}
