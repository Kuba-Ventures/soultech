import { UploadForm } from "@/components/portal/UploadForm";
import { DrivePicker } from "@/components/portal/DrivePicker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default function UploadPage() {
  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Upload
      </div>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">
        Upload your brain.
      </h1>
      <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-2xl">
        Drop in a document, a voice memo, or a transcript. Each upload is read,
        processed, and stored as memories. You can review and redact anything
        afterwards in <a href="/portal/memories" className="underline underline-offset-2">Memories</a>.
      </p>

      <div className="mt-10 space-y-4">
        <UploadForm />
        <DrivePicker />
      </div>

      <div className="mt-12 grid sm:grid-cols-2 gap-4 text-xs text-white/45">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="text-white/70 text-sm font-medium">Documents</div>
          <div className="mt-1">.txt, .md, .pdf · up to 25 MB</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="text-white/70 text-sm font-medium">Audio</div>
          <div className="mt-1">.mp3, .m4a, .wav, .webm · up to 25 MB</div>
        </div>
      </div>
    </div>
  );
}
