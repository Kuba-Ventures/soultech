"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processUpload } from "@/app/portal/upload/actions";
import type { UploadResult } from "@/app/portal/upload/types";
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/uploads/classify";

type Status =
  | { kind: "idle" }
  | { kind: "selected"; file: File }
  | { kind: "uploading"; file: File }
  | { kind: "done"; result: Extract<UploadResult, { ok: true }>; file: File }
  | { kind: "error"; message: string; file?: File };

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function onPick(file: File | null) {
    if (!file) return setStatus({ kind: "idle" });
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus({ kind: "error", message: "File is over 25 MB.", file });
      return;
    }
    setStatus({ kind: "selected", file });
  }

  function submit() {
    if (status.kind !== "selected") return;
    const file = status.file;
    setStatus({ kind: "uploading", file });
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const result = await processUpload(fd);
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error, file });
        return;
      }
      setStatus({ kind: "done", result, file });
      router.refresh();
    });
  }

  function reset() {
    setStatus({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  const activeFile =
    status.kind === "selected" ||
    status.kind === "uploading" ||
    status.kind === "done"
      ? status.file
      : status.kind === "error"
        ? status.file
        : null;

  return (
    <div>
      <label
        htmlFor="upload-input"
        className="block rounded-2xl border border-dashed border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04] transition cursor-pointer p-8 text-center"
      >
        <input
          ref={inputRef}
          id="upload-input"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          disabled={pending}
          className="sr-only"
        />
        <div className="text-sm text-white/75">
          {activeFile ? activeFile.name : "Click to choose a file"}
        </div>
        <div className="mt-1 text-[11px] text-white/40">
          {activeFile
            ? `${(activeFile.size / 1024 / 1024).toFixed(2)} MB`
            : ".txt, .md, .pdf, .mp3, .m4a, .wav, .webm"}
        </div>
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={status.kind !== "selected" || pending}
          className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition"
        >
          {status.kind === "uploading" ? "Processing…" : "Process upload"}
        </button>
        {(status.kind === "selected" ||
          status.kind === "done" ||
          status.kind === "error") && (
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="text-xs text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        )}
      </div>

      {status.kind === "uploading" && (
        <div className="mt-4 text-xs text-white/50">
          Chunking, summarizing, and embedding. This can take a moment for
          larger files.
        </div>
      )}

      {status.kind === "done" && (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4 text-sm">
          <div className="text-emerald-300">
            Added {status.result.memoryCount}{" "}
            {status.result.memoryCount === 1 ? "memory" : "memories"} from{" "}
            {status.file.name}.
          </div>
          <div className="mt-2 text-xs text-white/50">
            View them in <a className="underline" href="/portal/memories">Memories</a>.
          </div>
        </div>
      )}

      {status.kind === "error" && (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-4 text-sm text-rose-300">
          {status.message}
        </div>
      )}
    </div>
  );
}
