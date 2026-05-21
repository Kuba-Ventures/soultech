import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return <PortalShell email={email}>{children}</PortalShell>;
}
