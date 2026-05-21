import { currentUser } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/db/members";
import { getCorpusStats } from "@/lib/db/stats";
import { AccountDeletion } from "@/components/portal/AccountDeletion";
import { ResetCorpus } from "@/components/portal/ResetCorpus";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  const member = await getCurrentMember();
  const stats = await getCorpusStats(member.id);

  const email = user?.primaryEmailAddress?.emailAddress ?? member.email;
  const memberSince = new Date(member.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const lastActivity = stats.lastActivity
    ? new Date(stats.lastActivity).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const styleProfile = (
    member.settings as { styleProfile?: { generatedAt: string; memoriesAtGen: number } } | undefined
  )?.styleProfile;

  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Settings
      </div>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">
        Profile and account.
      </h1>

      <section className="mt-10">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Account
        </div>
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <Stat label="Email" value={email || "-"} />
          <Stat label="Member since" value={memberSince} />
          <Stat
            label="Last activity"
            value={lastActivity ?? "No activity yet"}
          />
          <Stat
            label="Voice profile"
            value={
              styleProfile
                ? `Generated ${new Date(styleProfile.generatedAt).toLocaleDateString()} (${styleProfile.memoriesAtGen} memories)`
                : "Not yet (needs 20+ reflect-chat memories)"
            }
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Corpus
        </div>
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Stat label="Total memories" value={stats.total.toString()} />
          <Stat label="From Reflect" value={stats.bySource.chat.toString()} />
          <Stat label="From documents" value={stats.bySource.upload_doc.toString()} />
          <Stat label="From audio" value={stats.bySource.upload_audio.toString()} />
          <Stat label="Redacted" value={stats.redacted.toString()} />
          <Stat label="Uploads (sources)" value={stats.uploadsTotal.toString()} />
        </div>
        {(stats.uploadsProcessing > 0 || stats.uploadsFailed > 0) && (
          <div className="mt-2 text-xs text-white/50">
            {stats.uploadsProcessing > 0 && (
              <span className="mr-3">
                {stats.uploadsProcessing} upload
                {stats.uploadsProcessing === 1 ? "" : "s"} still processing.
              </span>
            )}
            {stats.uploadsFailed > 0 && (
              <span className="text-rose-300/80">
                {stats.uploadsFailed} upload
                {stats.uploadsFailed === 1 ? "" : "s"} failed.
              </span>
            )}
          </div>
        )}
      </section>

      <ResetCorpus />
      <AccountDeletion email={email} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-white/85">{value}</div>
    </div>
  );
}
