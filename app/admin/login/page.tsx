import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { LoginForm } from "@/components/LoginForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Member log-in: ${brand.name}`,
  description: "Sign in to your early-access account.",
};

export default function AdminLoginPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-glow">
        <div className="mx-auto max-w-md px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center animate-fade-up">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Member access
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-medium tracking-[-0.02em] leading-[1.05]">
              Welcome back.
            </h1>
            <p className="mt-4 text-white/60">
              Sign in to your early-access account.
            </p>
          </div>
          <div className="mt-10">
            <LoginForm />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
