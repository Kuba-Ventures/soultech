import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Submission = {
  name: string;
  email: string;
  useCase: string;
  ts: string;
  source: string;
};

export async function POST(req: Request) {
  let body: Partial<Submission>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const useCase = String(body.useCase || "").trim();

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email" },
      { status: 400 },
    );
  }

  const entry: Submission = {
    name,
    email,
    useCase,
    ts: new Date().toISOString(),
    source: "landing-page",
  };

  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhook) {
    console.warn("[waitlist] WAITLIST_WEBHOOK_URL not set; logging instead:", entry);
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      redirect: "follow",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[waitlist] webhook non-2xx:", res.status, text.slice(0, 300));
    }
  } catch (err) {
    console.error(
      "[waitlist] webhook fetch failed:",
      err instanceof Error ? err.message : err,
    );
  }

  return NextResponse.json({ ok: true });
}
