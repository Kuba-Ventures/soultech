import { currentUser } from "@clerk/nextjs/server";

export default async function SettingsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="px-8 py-12 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Settings
      </div>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">
        Profile and account.
      </h1>

      <section className="mt-10 space-y-3">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Account
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm">
          <div className="text-white/50 text-xs">Email</div>
          <div className="mt-1">{email || "—"}</div>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Corpus
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm text-white/60">
          Corpus stats and danger-zone account deletion live here in Phase 4.
        </div>
      </section>
    </div>
  );
}
