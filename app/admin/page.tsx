import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { LogoutButton } from "@/components/LogoutButton";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Early access: ${brand.name}`,
  description: "Your early-access workspace.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = (await cookies()).get("admin_session")?.value;
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main>
      <SiteHeader />
      <section className="bg-glow">
        <div className="mx-auto max-w-2xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center animate-fade-up">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Early access
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.05]">
            You&rsquo;re in, {session}.
          </h1>
          <p className="mt-6 text-lg text-white/65 leading-relaxed">
            The product is in private beta. We&rsquo;ll email you the moment
            your slot opens for training.
          </p>
          <p className="mt-3 text-sm text-white/40">
            Want to talk shape before then? Reach us at{" "}
            <a
              href={`mailto:${brand.contactEmail}`}
              className="underline underline-offset-2 hover:text-white/70"
            >
              {brand.contactEmail}
            </a>
            .
          </p>
          <div className="mt-10 flex items-center justify-center">
            <LogoutButton />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
