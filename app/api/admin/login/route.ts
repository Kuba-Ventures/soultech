import { NextResponse } from "next/server";

const ADMIN_PASSWORD = "soultech";
const COOKIE_NAME = "admin_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email" },
      { status: 400 },
    );
  }
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: email,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
  return res;
}
