# Soultech
*A personalized learning AI built on a structured ten-category model of who you are.*

*Last updated: 2026-07-14 by kuba-vault*

---

## TL;DR

Soultech was repositioned back to its original v1 vision and shipped to production today. It is no longer the v4 "second self + two-way MCP connector" product; it's a personalized learning AI built on a structured ten-category model of how you communicate, think, and learn. You seed that model by pasting a self-portrait your existing ChatGPT/Claude writes (or uploading docs); Soultech parses it into the ten categories, and every chat turn is calibrated to it. Live at soultech-umber.vercel.app, owner-directed, shipped across PRs #24-#31. The main remaining work is tearing down the orphaned v4 surfaces so the app reads as one clean v1 product.

---

## What it is

**The problem:** General AI assistants don't know you. They don't adapt to your voice, how you reason, or how you like to be taught, and there's no low-effort way to hand them that context.

**The solution:** Import a structured model of yourself by pasting a self-portrait your existing ChatGPT/Claude already writes (or uploading your own docs). Soultech reads it into ten fixed categories of how you communicate, think, and learn, then calibrates every chat to it.

**The user:** People who want an AI that teaches and reasons in a way tuned to them, without wiring up integrations or filling out long forms.

**The value:** Paste once, get an assistant that talks in your register, delivers information the way you take it in, and pushes or affirms you the way you actually want. You own and edit the whole profile.

---

## Status

- **Phase:** live (v1 repositioning shipped to production)
- **Engagement manager:** self-directed
- **Lead:** Finley (finley@qsbsrollover.com)
- **Cadence:** continuous solo build; branch → PR → human bypass-merge
- **Next milestone:** v4 teardown — remove/unlink the orphaned v4 surfaces so the app is one clean v1 product
- **Flags:** shipping

---

## Where we are right now

The v1 repositioning is live on production. Across PRs #24-#31 (branch → PR → human bypass-merge) the product went from the v4 "second self / MCP connector / typed memory store" back to the original vision: paste in a self-portrait, get a structured ten-category profile, chat with an AI calibrated to it. The core loop works end to end — `/import` (or the `/welcome` wizard) parses your export into the ten categories, `/profile` lets you edit it, and `/talk` compiles it into the system prompt on every turn. The immediate next job is the **v4 teardown**: `/learn`, `/overview`, `/memory`, `/plugin`, `/sources`, and the old `/chat` still exist and are orphaned or only semi-linked (the sidebar still points at several of them), so the app doesn't yet read as a single product. Also deferred: the "mirror moment" profile review, the full calibration feedback loop, and moving the profile out of `members.settings` into a dedicated table. Two things for the human: production Clerk is still a dev instance, and the factory review gate is failing closed so every PR needs a manual bypass-merge.

---

## What's built

**Frontend / UI (v1 — the live product)**
- `/import` — paste-in onboarding. Parses an export into the ten-category schema and saves it (`app/(app)/import/`).
- `/profile` — the "who you are" hub. Items grouped by the ten categories, each with a source label; edit / add / delete individual items, plus delete-all (`components/app/ProfileHub.tsx`, `app/(app)/profile/`).
- `/welcome` — first-run onboarding wizard (Welcome → Paste → Upload docs → Connect → Done). Skippable, gated by an `onboardingV1Done` flag so it only shows once. **Connectors are visual stubs ("Soon")** — real OAuth was never built (`components/app/OnboardingWizard.tsx`, `app/welcome/`).
- `/talk` — personalized chat. Shows an "in your style: <tag>" eyebrow and a "Closer / Not quite" calibration tap (`components/app/TalkChat.tsx`, `app/(app)/talk/`).
- Landing refreshed to the v1 story: hero + "how it works" strip, rewritten `/how-it-works` and `/use-cases`. Header CTA is "Log in"; the waitlist gate is kept (`app/page.tsx`, `components/SiteChrome.tsx`).
- Settings: full account wipe (chats + memories + profile + everything) and restart-onboarding (`components/app/SettingsPanel.tsx`, `lib/db/reset.ts`).

**Backend / data (v1)**
- `lib/profile/v1/parse.ts` — text → ten-category items via an isolated `claude-opus-4-8` structured-outputs call (JSON-schema-constrained, thinking disabled). A sensitivity pass tags each item; `partitionBySensitivity` drops health/financial/location/identity items before anything is saved, and unclassified items fail closed to "identity" (dropped).
- `lib/profile/v1/types.ts` — the ten fixed category keys; single source of truth for the schema.
- `lib/compileProfile.ts` — isolated pure function that compiles a profile into the chat system prompt every turn, plus `styleTag()` for the "in your style" eyebrow. No I/O, unit-tested.
- `app/api/v1/chat/route.ts` — stateless personalized chat; loads the profile, compiles it, streams `claude-opus-4-8` as NDJSON, audits each turn.
- `lib/profile/v1/store.ts` — all v1 persistence. The profile (`profileV1`), the onboarding flag (`onboardingV1Done`), and calibration signals (`chatCalibrationV1`) all live in `members.settings` JSON. **No dedicated profile table yet** — a deliberate later swap.

**Orphaned v4 surfaces (still in the codebase, teardown pending)**
- Routes `/learn`, `/overview`, `/memory`, `/plugin`, `/sources`, and the old `/chat` still exist and are orphaned or only semi-linked (the sidebar still lists Learn/Plug in/Overview/Memory/Sources).
- The v4 tables (`memories`, `sources`, `conversations`, `learning_styles`, `tracks`, `tool_connections`) and the per-user MCP server at `app/api/mcp/[token]/` still exist. None are part of the v1 loop.

**Infrastructure**
- Vercel auto-deploys `main` (project `soultech`). Drizzle migrations on Neon Postgres.

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next 16 App Router + React 18 + TypeScript | `app/(app)/` route group |
| Auth | Clerk (`@clerk/nextjs` 7) | **production is a DEV instance** — see Risks; MCP route Clerk-exempt in `middleware.ts` |
| ORM / DB | Drizzle ORM on Neon serverless Postgres | `lib/db/`; v1 profile lives in `members.settings` JSON, not a dedicated table |
| LLM | Anthropic `claude-opus-4-8` | extraction (`lib/profile/v1/parse.ts`) + chat (`app/api/v1/chat/route.ts`) |
| Doc parsing | `pdf-parse` | `lib/profile/v1/extractText.ts` |
| Transcription | Deepgram | v4-era; not part of the v1 loop |
| Styling | Tailwind 3 + `.app`-scoped CSS design system | `app/globals.css`, `design/soultech.html` |
| Hosting | Vercel | auto-deploy on `main` |
| Tests | Vitest | `vitest.config.ts`; includes `lib/compileProfile.test.ts`, `lib/profile/v1/*.test.ts` |

---

## Integrations & MCPs

| Integration | Purpose | Cost | Status |
|---|---|---|---|
| Clerk | Authentication for the app surface | unknown | live (DEV instance — must swap to prod keys before launch) |
| Neon Postgres | Primary datastore (v1 profile in `members.settings` JSON) | unknown | live |
| Anthropic | `claude-opus-4-8` for profile extraction + personalized chat | usage-based | live |
| Deepgram | Audio transcription (v4-era) | usage-based | present, not in v1 loop |
| Soultech MCP server (per-user) | v4 two-way connector | self-hosted | orphaned (teardown pending) |
| Onboarding connectors (Calendar/Gmail/Spotify, etc.) | Future profile sources | unknown | visual stubs only ("Soon") — no OAuth built |

*Source: no MCP config files found in repo. Built from `package.json` dependencies, `middleware.ts`, and the v1 code (`app/api/v1/chat/route.ts`, `lib/profile/v1/`, `lib/compileProfile.ts`).*

---

## Decisions log

The "why" behind key choices. Newest first.

- **2026-07-14 — Repositioned from the v4 "second self / MCP connector" back to the v1 vision.** The v4 outward "second self + two-way MCP connector + typed memory store" was set aside in favor of the original v1 idea: a personalized learning AI built on a structured ten-category model of the user, seeded by pasting a self-portrait their existing ChatGPT/Claude writes. Rejected: continuing to build out v4 (MCP OAuth, tracks, typed memory). Reverses the 2026-06-03 "second self" reposition.
- **2026-07-14 — The profile is always structured JSON in ten fixed categories, never free text.** A single source-of-truth schema (`lib/profile/v1/types.ts`) that every feature reads — the hub, per-item editing, the compile-to-prompt step, the future "mirror moment." Extraction is a JSON-schema-constrained `claude-opus-4-8` call so the model can only return schema-valid items.
- **2026-07-14 — Drop sensitive items before they're ever persisted.** Each parsed item is tagged (health/financial/location/identity/none); only "none" is saved. Anything the model doesn't clearly classify fails closed to "identity" and is dropped. Keeps private content out of storage and out of the system prompt.
- **2026-07-14 — Compile the profile into the system prompt as an isolated pure function.** `lib/compileProfile.ts` translates observations into behavior ("do X") and tells the model to act calibrated, not describe the profile back. No I/O so personalization quality can be iterated and unit-tested in isolation.
- **2026-07-14 — Store the v1 profile in `members.settings` JSON, not a new table (yet).** Same `Profile` shape a dedicated table would hold, so promoting it later is a storage swap, not a schema change. Onboarding flag and calibration signals ride in the same JSON blob. Lets v1 ship without a migration.
- **2026-07-14 — Onboarding connectors ship as visual stubs.** The wizard shows connector logos marked "Soon"; no real OAuth was built. Paste + upload are the only working import paths for now.
- **2026-07-14 — Calibration signal is captured but the loop is deferred.** The "Closer / Not quite" taps are stored (bounded to 200) but not yet folded back into the profile.
- **2026-06-03 — Repositioned from inward "reflective clone" to outward "second self."** (Superseded 2026-07-14.) The portal-only reflection product had a weak value loop; the reframe made the clone useful inside Claude/Cursor via MCP. Rejected: continuing to polish the standalone portal.
- **2026-06-03 — The two-way MCP connector is the moat.** (Superseded 2026-07-14.) A live per-user MCP server (read profile/style/memories/tracks, write memories + track progress) as the differentiator, built stateless Streamable HTTP / JSON-RPC.
- **2026-06-03 — Token-as-auth for the MCP server, Clerk-exempt.** The MCP endpoint authenticated by connection token, not a Clerk session; `middleware.ts` skips `/api/mcp(.*)`. (Server now orphaned pending teardown.)
- **2026-06-03 — Per-category scopes + master write-back gate, enforced server-side.** Read/write gated per category; sensitive categories denied until consent; every call audited. (v4 surface.)
- **2026-06-03 — Reuse the stack, rewrite the product.** Kept Next/Clerk/Drizzle/Neon/Anthropic; additive migrations and a new route group instead of a from-scratch rebuild.
- **2026-06-03 — Additive-only migrations and jsonb `members.settings` for soft data.** `memories.type` defaulted to MEMORY; questionnaire answers, consent, and the overview portrait lived in `members.settings`.
- **2026-06-03 — Keep old `/portal/*` links alive via redirects.** No dead bookmarks through the IA move.
- **2026-06-03 — Softened the factory-review merge gate during active dev (#12).** Reverses the fail-closed gate from #11 to reduce friction. Every auth/DB/AI PR admin-merged with owner authorization.

---

## Open loops

- [ ] **v4 teardown** — remove/unlink `/learn`, `/overview`, `/memory`, `/plugin`, `/sources`, old `/chat`, the MCP server, and the orphaned v4 tables so the app reads as one clean v1 product — Finley
- [ ] Swap production Clerk from the DEV instance to production keys before any public launch — Finley
- [ ] Fix the factory review gate so it can apply `factory:lowrisk` / `factory:escalate` labels (currently fails closed → every PR needs a manual bypass-merge) — Finley
- [ ] Build the "mirror moment" profile review after import — Finley
- [ ] Close the calibration feedback loop (fold "Closer / Not quite" signals back into the profile) — Finley
- [ ] Promote the v1 profile from `members.settings` JSON to a dedicated DB table — Finley
- [ ] Update the sidebar to drop the orphaned v4 nav items — Finley
- [ ] Refresh `README.md` (still describes an older product) — Finley

---

## Risks & known issues

- **Production Clerk is a DEV instance (dev keys).** Must switch to production keys before a real public launch.
- **Factory review gate fails closed.** It appears to be missing the `factory:lowrisk` / `factory:escalate` labels, so no PR is marked mergeable and every one needs a human bypass-merge. Per `CLAUDE.md`, anything touching auth/DB/AI must escalate regardless.
- v4 surfaces (`/learn`, `/overview`, `/memory`, `/plugin`, `/sources`, old `/chat`) and the MCP server are still present and semi-linked — the app doesn't yet read as a single v1 product until the teardown lands.
- The v1 profile, onboarding flag, and calibration signals share one `members.settings` JSON blob with no dedicated table — fine for now, but a migration is pending.
- Onboarding connectors are visual stubs; users may expect Calendar/Gmail/Spotify to actually connect.
- The calibration signal is captured but does nothing yet (loop deferred).
- No signed-in end-to-end QA pass on production has been recorded for the v1 loop.

---

## Links

- **Live URL:** https://soultech-umber.vercel.app
- **Staging:** (none — Vercel auto-deploys main)
- **Client Drive folder:** (none known)
- **Slack channel:** (none known)
- **Related repos:** (none — single repo)

---

## Changelog

What changed and when, newest first.

- **2026-07-14:** Repositioned Soultech back to the v1 vision and shipped to production — structured ten-category profile, paste-in import, personalized chat (PRs #24-#31). Rewrote PROJECT.md to match; noted the pending v4 teardown, the Clerk dev-instance and factory-gate flags.
- **2026-07-14:** Stage 3 — personalized chat + `compileProfile` (#31).
- **2026-07-14:** Settings — full account wipe (#30).
- **2026-07-14:** Profile — bias extraction to style + drop sensitive items before saving (#29).
- **2026-07-14:** Settings — "Reset data" + "Restart onboarding" (#28).
- **2026-07-14:** Onboarding wizard — show the prompt, doc examples, connector logos (#27).
- **2026-07-14:** Landing content refresh to the v1 story (#26).
- **2026-07-14:** First-run onboarding wizard (paste + upload + connect) (#25).
- **2026-07-14:** v1 rebuild (Stages 1-2) — paste-in onboarding + ten-category profile hub (#24).
- **2026-06-03:** Initial PROJECT.md superdoc created capturing the v4 learn-first rebuild (PRs #13-#21).
- **2026-06-03:** Phase 4 — Craft: accessibility, motion, polish (#21).
- **2026-06-03:** Phase 3b-4 — `/chat` auto-save + learning-style inference (#20).
- **2026-06-03:** Phase 3b-3 — `/sources` (connections, questionnaires, uploads) + consent (#19).
- **2026-06-03:** Phase 3b-2 — `/overview` (ring, self-rewriting summary, facts, gaps) (#17).
- **2026-06-03:** Phase 3b-1 — `/memory` typed records + `memories.type` (#16).
- **2026-06-03:** Phase 3a — live two-way MCP server + enforced scope (#15).
- **2026-06-03:** Phase 2 — the flywheel + MCP connector on `/plugin` (#14).
- **2026-06-03:** Phase 1 — learn-first reframe: routing, design system, Learn page (#13).
</content>
</invoke>
