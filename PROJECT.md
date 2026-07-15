# Soultech
*A personalized learning AI built on a structured ten-category model of who you are.*

*Last updated: 2026-07-15 by kuba-vault*

---

## TL;DR

Soultech is a personalized learning AI built on a structured ten-category model of how you communicate, think, and learn. You seed that model from sources: paste a self-portrait your existing ChatGPT/Claude writes, upload a doc, connect Notion, or add your own text. Soultech parses each source into the ten categories, and every chat turn is calibrated to it. The v4 teardown is done, so the app now reads as one clean v1 product, and the old "Import" page grew into a full Sources manager where every source is listed and removable, with removal cascading to everything that source taught. Live at soultech-umber.vercel.app, owner-directed, shipped through PR #43. Notion is the first live connection; Google Drive, Gmail, and Spotify are shown as "Soon" stubs.

---

## What it is

**The problem:** General AI assistants don't know you. They don't adapt to your voice, how you reason, or how you like to be taught, and there's no low-effort way to hand them that context.

**The solution:** Build a structured model of yourself from sources — paste a self-portrait your existing ChatGPT/Claude already writes, upload docs, connect Notion, or add your own text. Soultech reads each source into ten fixed categories of how you communicate, think, and learn, then calibrates every chat to it.

**The user:** People who want an AI that teaches and reasons in a way tuned to them, without filling out long forms.

**The value:** Feed it a few sources, get an assistant that talks in your register, delivers information the way you take it in, and pushes or affirms you the way you actually want. You own every source and can remove any one of them, which deletes everything it contributed.

---

## Status

- **Phase:** live (v1, post-teardown; source manager + first live connection shipped)
- **Engagement manager:** self-directed
- **Lead:** Finley (finley@qsbsrollover.com)
- **Cadence:** continuous solo build; branch → PR → human bypass-merge
- **Next milestone:** access-controlled file storage (signed URLs for Blob), then promote the v1 profile out of `members.settings` into a dedicated table
- **Flags:** shipping

---

## Where we are right now

The v4 teardown landed (PR #34), so the app is v1-only — no more orphaned `/learn`, `/overview`, `/memory`, `/plugin`, `/sources`, old `/chat`, or the per-user MCP server. Since then the focus was sources. The old "Import" page (route still `/import`, sidebar label now "Sources") became a full source manager (`components/app/SourcesManager.tsx`, PR #43): "Add a source" grouped by provider (Import from Claude / ChatGPT, Upload a file, Connect Notion, plus Google Drive / Gmail / Spotify as "Soon" stubs, plus Add custom), and "Your sources" — a managed list of everything added, with per-source Remove that **cascades**, deleting the source, every profile item it contributed, its stored file, and (for Notion) its token. Notion is the first live connection (PR #42): the member pastes their own integration token, it's encrypted at rest with AES-256-GCM and never sent back to the client, and a read-only bounded pull of shared pages runs in the background through the same sensitivity filter as every other import. Raw uploaded files can now optionally be retained on Vercel Blob (PR #43), gated behind an env var. Deferred as before: the "mirror moment" profile review, closing the calibration loop, and moving the profile out of `members.settings` into a table. Three things for the human: production Clerk is still a dev instance, the factory review gate still fails closed (every PR needs a manual bypass-merge), and Blob file URLs are public-but-unguessable with no per-request auth — signed-URL storage is the flagged hardening follow-up.

---

## What's built

**Frontend / UI (v1 — the live product)**
- `/import` (sidebar label "Sources") — full source manager. "Add a source" grouped by provider: Import from Claude / ChatGPT (paste an AI export, one per assistant), Upload a file (.txt/.md/.pdf), Connect Notion (live), Add custom (name + pasted text), plus Google Drive / Gmail / Spotify shown as "Soon" stubs. "Your sources" lists every source added — provider icon, kind, date, and how many profile items it contributed — each with a Remove button that cascades (`components/app/SourcesManager.tsx`, `app/(app)/import/`).
- `/profile` — the "who you are" hub: a portrait header plus prose sections over the ten categories; edit / add / delete individual items, plus delete-all (`components/app/ProfileHub.tsx`, `lib/profile/v1/summary.ts`, `app/(app)/profile/`).
- `/welcome` — first-run onboarding wizard (Welcome → Paste → Sources → Done); upload + doc-source connectors merged onto one "Sources" step, imports read in the background so the wizard doesn't block. Skippable, gated by an `onboardingV1Done` flag (`components/app/OnboardingWizard.tsx`, `app/welcome/`).
- `/talk` — personalized chat. Shows an "in your style: <tag>" eyebrow and a "Closer / Not quite" calibration tap (`components/app/TalkChat.tsx`, `app/(app)/talk/`).
- Landing on the v1 story: hero + "how it works" strip, `/how-it-works` and `/use-cases`. Header CTA is "Log in"; the waitlist gate is kept (`app/page.tsx`, `components/SiteChrome.tsx`).
- Settings: full account wipe (chats + memories + profile + everything) and restart-onboarding (`components/app/SettingsPanel.tsx`, `lib/db/reset.ts`).

**Backend / data (v1)**
- `app/(app)/import/actions.ts` — server actions for every source path: `importProviderPaste`, `addCustomSource`, `uploadFileSource`, `removeSourceAction`, and the Notion actions (`connectNotionAction` / `pullNotionAction` / `disconnectNotionAction`). All ingestion runs through one `ingestAsSource` helper so every source hits the same sensitivity filter and gets tagged with a `sourceId`.
- `lib/connections/` — bring-your-own Notion integration. `crypto.ts` encrypts the token at rest with AES-256-GCM (key derived from env `CONNECTIONS_ENC_KEY`); `store.ts` persists only ciphertext in `members.settings`, decrypts server-side, never returns the token to the client; `notion.ts` does a read-only bounded pull of shared pages. The pull runs in the background via `after()`.
- `lib/uploads/userFiles.ts` — optional at-rest storage of raw uploaded files on Vercel Blob, gated behind env `BLOB_READ_WRITE_TOKEN`. Without it, uploads still work (extracted items kept) but bytes aren't retained. Blob URLs are public-but-unguessable (no per-request auth) — hardening flagged.
- `lib/profile/v1/parse.ts` — text → ten-category items via an isolated `claude-opus-4-8` structured-outputs call (JSON-schema-constrained, thinking disabled). A sensitivity pass tags each item; `partitionBySensitivity` drops health/financial/location/identity items before anything is saved, and unclassified items fail closed to "identity" (dropped).
- `lib/profile/v1/store.ts` — all v1 persistence. The profile (`profileV1`), the source registry (`sourcesV1`: list / per-source counts / upsert / cascade-remove), onboarding flag (`onboardingV1Done`), summary cache, and calibration signals (`chatCalibrationV1`) all live in `members.settings` JSON. `ProfileItem` now carries an optional `sourceId`; `removeSource` cascade-deletes every item with that id. **No dedicated profile or sources table yet** — a deliberate later swap.
- `lib/profile/v1/types.ts` — the ten fixed category keys plus the `SourceEntry` / `SourceKind` types; single source of truth for the schema.
- `lib/compileProfile.ts` — isolated pure function that compiles a profile into the chat system prompt every turn, plus `styleTag()` for the "in your style" eyebrow. No I/O, unit-tested.
- `app/api/v1/chat/route.ts` — stateless personalized chat; loads the profile, compiles it, streams `claude-opus-4-8` as NDJSON, audits each turn.

**Infrastructure**
- Vercel auto-deploys `main` (project `soultech`). Drizzle migrations on Neon Postgres. Optional Vercel Blob store for raw uploaded files.
- v4 teardown complete (PR #34): the orphaned routes, components, the per-user MCP server (`app/api/mcp/[token]/`), and their nav entries are removed.

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next 16 App Router + React 18 + TypeScript | `app/(app)/` route group |
| Auth | Clerk (`@clerk/nextjs` 7) | **production is a DEV instance** — see Risks; MCP route Clerk-exempt in `middleware.ts` |
| ORM / DB | Drizzle ORM on Neon serverless Postgres | `lib/db/`; v1 profile + source registry live in `members.settings` JSON, not a dedicated table |
| LLM | Anthropic `claude-opus-4-8` | extraction (`lib/profile/v1/parse.ts`) + chat (`app/api/v1/chat/route.ts`) |
| Doc parsing | `pdf-parse` | `lib/profile/v1/extractText.ts` |
| File storage | Vercel Blob (`@vercel/blob`) | optional; raw uploaded files, gated by `BLOB_READ_WRITE_TOKEN` (`lib/uploads/userFiles.ts`) |
| Connections | Notion integration token, AES-256-GCM at rest | `lib/connections/`; gated by `CONNECTIONS_ENC_KEY` |
| Transcription | Deepgram | v4-era dependency; not part of the v1 loop |
| Icons | `simple-icons`, `lucide-react` | provider brand icons in the source manager |
| Styling | Tailwind 3 + `.app`-scoped CSS design system | `app/globals.css`, `design/soultech.html` |
| Hosting | Vercel | auto-deploy on `main` |
| Tests | Vitest | `vitest.config.ts`; includes `lib/compileProfile.test.ts`, `lib/profile/v1/*.test.ts` |

---

## Integrations & MCPs

| Integration | Purpose | Cost | Status |
|---|---|---|---|
| Clerk | Authentication for the app surface | unknown | live (DEV instance — must swap to prod keys before launch) |
| Neon Postgres | Primary datastore (v1 profile + source registry in `members.settings` JSON) | unknown | live |
| Anthropic | `claude-opus-4-8` for profile extraction + personalized chat | usage-based | live |
| Notion | Bring-your-own integration token; read-only bounded pull of shared pages into the profile | free (member's own token) | live |
| Vercel Blob | Optional at-rest storage of raw uploaded files; gated by `BLOB_READ_WRITE_TOKEN` | usage-based | live (opt-in per env) |
| Deepgram | Audio transcription (v4-era dependency) | usage-based | present, not in v1 loop |
| Google Drive / Gmail / Spotify | Future profile sources | unknown | "Soon" stubs — no OAuth built |

*Source: no MCP config files found in repo. Built from `package.json` dependencies, `middleware.ts`, and the v1 code (`app/(app)/import/actions.ts`, `lib/connections/`, `lib/uploads/userFiles.ts`, `lib/profile/v1/`, `lib/compileProfile.ts`).*

---

## Decisions log

The "why" behind key choices. Newest first.

- **2026-07-15 — Every source is a first-class, removable object, and removal cascades.** Sources are tracked in a `sourcesV1` registry and each profile item carries the `sourceId` it came from, so removing a source deletes the source, every item it contributed, its stored file, and (for Notion) its token. Gives the member a clean "take it back" — no orphaned data from a source they revoked. Rejected: untracked one-way imports (no way to undo a single source).
- **2026-07-15 — Notion is bring-your-own integration token, encrypted at rest, read-only.** The member pastes their own Notion integration token; it's encrypted with AES-256-GCM (`CONNECTIONS_ENC_KEY`), stored as ciphertext, decrypted only server-side, never returned to the client. Pull is read-only and bounded, and runs through the same sensitivity filter as every import. Rejected for now: full OAuth (more build, more surface) — bring-your-own token ships the first live connection fast while keeping the secret off the client.
- **2026-07-15 — Notion pull runs in the background via `after()`.** Connecting registers the source immediately and returns; items fill in as the background pull completes. Keeps the connect action snappy and avoids blocking on a slow external fetch.
- **2026-07-15 — Raw file retention is opt-in behind an env var, and uploads work without it.** Vercel Blob storage is gated by `BLOB_READ_WRITE_TOKEN`; without the token, uploads still extract profile items but don't retain bytes. Lets the product ship without hard-wiring a storage bill or a storage dependency. Known caveat: Blob URLs are public-but-unguessable (no per-request auth) — signed-URL storage is the flagged hardening follow-up.
- **2026-07-15 — v4 teardown completed (not deferred).** The orphaned v4 routes, components, the per-user MCP server, and their nav entries were removed (PR #34) rather than left semi-linked, so the app reads as one v1 product. Reverses the 2026-07-14 "teardown pending" state.
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

- [ ] Move raw file storage to access-controlled (signed-URL) Blob — today's URLs are public-but-unguessable with no per-request auth — Finley
- [ ] Swap production Clerk from the DEV instance to production keys before any public launch — Finley
- [ ] Fix the factory review gate so it can apply `factory:lowrisk` / `factory:escalate` labels (currently fails closed → every PR needs a manual bypass-merge) — Finley
- [ ] Build the "mirror moment" profile review after import — Finley
- [ ] Close the calibration feedback loop (fold "Closer / Not quite" signals back into the profile) — Finley
- [ ] Promote the v1 profile + `sourcesV1` registry from `members.settings` JSON to dedicated DB tables — Finley
- [ ] Build real connections for the "Soon" stubs (Google Drive / Gmail / Spotify) — Finley
- [ ] Refresh `README.md` (still describes an older product) — Finley

---

## Risks & known issues

- **Vercel Blob file URLs are public-but-unguessable.** Stored raw files are served from public URLs with no per-request auth; the memberId path plus a random suffix is the only protection. Signed-URL / access-controlled storage is the flagged hardening follow-up.
- **Production Clerk is a DEV instance (dev keys).** Must switch to production keys before a real public launch.
- **Factory review gate fails closed.** It appears to be missing the `factory:lowrisk` / `factory:escalate` labels, so no PR is marked mergeable and every one needs a human bypass-merge. Per `CLAUDE.md`, anything touching auth/DB/AI must escalate regardless.
- The v1 profile, source registry, onboarding flag, and calibration signals share one `members.settings` JSON blob with no dedicated table — fine for now, but a migration is pending.
- Google Drive / Gmail / Spotify show as "Soon" stubs; users may expect them to actually connect.
- The calibration signal is captured but does nothing yet (loop deferred).
- No signed-in end-to-end QA pass on production has been recorded for the source manager + Notion connection path.

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

- **2026-07-15:** Rewrote PROJECT.md for the source-manager era — Sources page, Notion connection, optional Vercel Blob file storage, `sourcesV1` registry + cascade removal, `CONNECTIONS_ENC_KEY` / `BLOB_READ_WRITE_TOKEN` env vars, and the v4-teardown-complete state. Flagged public-but-unguessable Blob URLs as the hardening follow-up.
- **2026-07-15:** Sources manager — provider-sorted "Add a source" + managed source list with cascade removal (#43); adds optional raw-file storage on Vercel Blob.
- **2026-07-15:** Notion connection — paste a bring-your-own integration token (encrypted at rest), background pull of shared pages into the profile (#42).
- **2026-07-15:** Sources page — LLM import as one section + a Connections section; sidebar label "Import" → "Sources" (#39).
- **2026-07-15:** Profile — portrait header + prose sections (#38); narrative synthesis for faster, cleaner imports (#35).
- **2026-07-15:** Onboarding — upload + doc-source connectors merged onto one "Sources" step (#37); imports read in the background so the wizard doesn't block (#36).
- **2026-07-15:** v4 teardown — removed the orphaned v4 routes, components, and the per-user MCP server; app is v1-only (#34).
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
