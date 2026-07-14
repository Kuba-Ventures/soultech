import { SettingsPanel } from "@/components/app/SettingsPanel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <section className="screen on">
      <div className="eyebrow rise">Settings</div>
      <h1 className="mb-2 font-display text-2xl text-[var(--text)]">Settings</h1>
      <p className="mb-6 max-w-2xl text-[var(--t-dim)]">
        Manage your data and setup. Deleting your whole profile lives on the profile page;
        account-level ownership and per-tool scopes land in a later phase.
      </p>
      <SettingsPanel />
    </section>
  );
}
