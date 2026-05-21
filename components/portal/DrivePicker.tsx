"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { processUpload } from "@/app/portal/upload/actions";
import type { UploadResult } from "@/app/portal/upload/types";

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type DriveFilePick = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
};

type Status =
  | { kind: "idle" }
  | { kind: "downloading"; name: string }
  | { kind: "uploading"; name: string }
  | { kind: "done"; result: Extract<UploadResult, { ok: true }>; name: string }
  | { kind: "error"; message: string };

const EXPORT_FOR_GOOGLE_DOC: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": { mime: "text/plain", ext: ".txt" },
  "application/vnd.google-apps.spreadsheet": { mime: "text/csv", ext: ".csv" },
  "application/vnd.google-apps.presentation": { mime: "text/plain", ext: ".txt" },
};

export function DrivePicker() {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  const credsMissing = !clientId || !apiKey || !appId;

  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [pickerReady, setPickerReady] = useState(false);
  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [, startTransition] = useTransition();

  // Load Picker module from gapi.
  useEffect(() => {
    if (!gapiLoaded || pickerReady) return;
    window.gapi!.load("picker", { callback: () => setPickerReady(true) });
  }, [gapiLoaded, pickerReady]);

  const onTokenResponse = useCallback((resp: any) => {
    if (resp?.error) {
      setStatus({ kind: "error", message: `Google auth failed: ${resp.error}` });
      return;
    }
    accessTokenRef.current = resp.access_token;
    openPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialise GIS token client once GIS is loaded.
  useEffect(() => {
    if (!gisLoaded || tokenClientRef.current || !clientId) return;
    tokenClientRef.current = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: onTokenResponse,
    });
  }, [gisLoaded, clientId, onTokenResponse]);

  function openPicker() {
    if (!accessTokenRef.current || !apiKey || !appId) return;
    const picker = new window.google!.picker.PickerBuilder()
      .setOAuthToken(accessTokenRef.current)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .addView(window.google!.picker.ViewId.DOCS)
      .setCallback((data: any) => {
        if (data.action !== window.google!.picker.Action.PICKED) return;
        const doc = data.docs?.[0];
        if (!doc) return;
        handleFile({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes ? Number(doc.sizeBytes) : undefined,
        });
      })
      .build();
    picker.setVisible(true);
  }

  async function handleFile(file: DriveFilePick) {
    const token = accessTokenRef.current;
    if (!token) {
      setStatus({ kind: "error", message: "No Drive access token. Try again." });
      return;
    }
    setStatus({ kind: "downloading", name: file.name });

    try {
      const { blob, downloadedName, mimeType } = await downloadFromDrive(file, token);
      const fileObj = new File([blob], downloadedName, { type: mimeType });

      setStatus({ kind: "uploading", name: downloadedName });
      startTransition(async () => {
        const fd = new FormData();
        fd.set("file", fileObj);
        const result = await processUpload(fd);
        if (!result.ok) {
          setStatus({ kind: "error", message: result.error });
          return;
        }
        setStatus({ kind: "done", result, name: downloadedName });
        router.refresh();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({
        kind: "error",
        message: `Drive download failed: ${msg.slice(0, 200)}`,
      });
    }
  }

  function onClick() {
    if (credsMissing) {
      setStatus({ kind: "error", message: "Google credentials not configured." });
      return;
    }
    if (!tokenClientRef.current || !pickerReady) {
      setStatus({ kind: "error", message: "Picker still loading, try again in a moment." });
      return;
    }
    if (accessTokenRef.current) {
      openPicker();
    } else {
      tokenClientRef.current.requestAccessToken({ prompt: "" });
    }
  }

  if (credsMissing) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm text-white/55">
        <div className="text-white/75 text-sm font-medium">From Google Drive</div>
        <div className="mt-2 text-xs text-white/45 leading-relaxed">
          Set <code className="text-white/70">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>,{" "}
          <code className="text-white/70">NEXT_PUBLIC_GOOGLE_API_KEY</code>, and{" "}
          <code className="text-white/70">NEXT_PUBLIC_GOOGLE_APP_ID</code> to enable the
          Drive picker.
        </div>
      </div>
    );
  }

  const ready = gapiLoaded && gisLoaded && pickerReady;
  const busy = status.kind === "downloading" || status.kind === "uploading";

  return (
    <>
      <Script
        src="https://apis.google.com/js/api.js"
        strategy="afterInteractive"
        onLoad={() => setGapiLoaded(true)}
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisLoaded(true)}
      />
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm text-white/85 font-medium">From Google Drive</div>
            <div className="mt-1 text-xs text-white/45">
              Pick a Doc, Sheet, Slides deck, PDF, or audio file. Google-native files
              are auto-exported to text or CSV.
            </div>
          </div>
          <button
            type="button"
            onClick={onClick}
            disabled={!ready || busy}
            className="shrink-0 inline-flex items-center justify-center rounded-full bg-white text-black px-4 py-2 text-xs font-medium hover:bg-white/90 disabled:opacity-40 transition"
          >
            {busy ? "Working…" : ready ? "Pick from Drive" : "Loading…"}
          </button>
        </div>

        {status.kind === "downloading" && (
          <div className="mt-3 text-xs text-white/55">
            Downloading {status.name}…
          </div>
        )}
        {status.kind === "uploading" && (
          <div className="mt-3 text-xs text-white/55">
            Chunking and embedding {status.name}…
          </div>
        )}
        {status.kind === "done" && (
          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-3 text-xs text-emerald-300">
            Added {status.result.memoryCount}{" "}
            {status.result.memoryCount === 1 ? "memory" : "memories"} from{" "}
            {status.name}.
          </div>
        )}
        {status.kind === "error" && (
          <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3 text-xs text-rose-300">
            {status.message}
          </div>
        )}
      </div>
    </>
  );
}

async function downloadFromDrive(
  file: DriveFilePick,
  accessToken: string,
): Promise<{ blob: Blob; downloadedName: string; mimeType: string }> {
  const exportTarget = EXPORT_FOR_GOOGLE_DOC[file.mimeType];
  if (exportTarget) {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      file.id,
    )}/export?mimeType=${encodeURIComponent(exportTarget.mime)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`${res.status} ${detail.slice(0, 200)}`);
    }
    const blob = await res.blob();
    const name = file.name.toLowerCase().endsWith(exportTarget.ext)
      ? file.name
      : file.name + exportTarget.ext;
    return { blob, downloadedName: name, mimeType: exportTarget.mime };
  }

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    file.id,
  )}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detail.slice(0, 200)}`);
  }
  const blob = await res.blob();
  return { blob, downloadedName: file.name, mimeType: file.mimeType };
}
