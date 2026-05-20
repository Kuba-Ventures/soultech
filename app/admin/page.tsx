import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: brand.name,
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = (await cookies()).get("admin_session")?.value;
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-ink text-white">
      <div className="fixed top-4 right-4 z-50">
        <LogoutButton />
      </div>
      {/* Product canvas. Build UI below. */}
    </main>
  );
}
