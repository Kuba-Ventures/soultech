import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Demo backend: append submissions to /data/waitlist.json.
// NOTE: Vercel's filesystem is ephemeral — writes don't persist across
// invocations. This is fine for an internal demo. For a real launch swap to:
//   - Resend (email notifications)
//   - Formspree (zero-backend form)
//   - Supabase / Convex / Postgres (durable storage)
//   - Loops / ConvertKit (waitlist platforms)
// Look for `TODO: backend swap` markers to find the integration point.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Submission = {
  name: string;
  email: string;
  useCase: string;
  ts: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "waitlist.json");

async function readAll(): Promise<Submission[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(rows: Submission[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
}

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
  };

  // TODO: backend swap — replace this block with a Resend / Supabase / etc. call.
  try {
    const rows = await readAll();
    rows.push(entry);
    await writeAll(rows);
  } catch (err) {
    // On Vercel the filesystem is read-only outside /tmp — log and succeed
    // so the user still sees the success state during the demo.
    console.warn(
      "[waitlist] could not persist to disk (expected on Vercel):",
      err instanceof Error ? err.message : err,
    );
    console.log("[waitlist] submission:", entry);
  }

  return NextResponse.json({ ok: true });
}
