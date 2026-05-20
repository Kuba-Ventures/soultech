# Soultech: Landing Page

Single-page Next.js + Tailwind landing site to validate demand for a personalized AI learning product.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/
  layout.tsx           # root layout, dark by default, TODO marker for analytics
  page.tsx             # full landing page (hero / how it works / use cases / form / footer)
  globals.css          # tailwind layers + small set of utilities
  api/waitlist/route.ts  # POST endpoint, writes to /data/waitlist.json (demo only)
components/
  Logo.tsx             # renders /public/logo.png, white-filtered for dark bg
  ChatMockup.tsx       # static CSS-only chat UI mockup for the hero
  WaitlistForm.tsx     # client-side form with success state
lib/
  brand.ts             # one-place brand swap (name, tagline, contact, logo)
public/
  logo.png             # Soultech Management wordmark
```

## Brand swap

Edit `lib/brand.ts`. Everything else picks up from there.

## Email backend

`app/api/waitlist/route.ts` currently appends to `data/waitlist.json`, fine for a demo but Vercel's filesystem is ephemeral. To go live, swap the marked block for one of:

- **Resend**: send yourself an email per signup
- **Formspree**: point the client form at a Formspree endpoint, delete the API route
- **Supabase / Convex / Postgres**: durable storage with a real schema
- **Loops / ConvertKit**: purpose-built waitlist tools

Search for `TODO: backend swap` to find the integration point.

## Deploy

This repo is already linked to Vercel. `git push` → Vercel auto-deploys.

## Analytics

Drop tracking pixels into `app/layout.tsx`. There's a `TODO` comment marking the spot.
