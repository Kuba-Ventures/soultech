# Soultech
*A second self that learns how you learn and plugs into Claude/Cursor via a two-way MCP connector.*

*Last updated: 2026-06-03 22:50 ET by kuba-vault*

---

## TL;DR

Soultech is live on production at soultech-umber.vercel.app. The v4 rebuild just shipped: the product was repositioned from an inward "reflective clone" portal into an outward "second self" that learns how you learn and accelerates you inside the tools you already use. The moat is a live two-way MCP server (one per user, token-authed) that lets Claude/Cursor read your profile, learning style, memories, and tracks, and write new memories and track progress back, all under per-category scopes you control. The whole rebuild went out across eight PRs (#13-#21) on the existing stack: Next 16, Clerk, Drizzle on Neon Postgres + pgvector, Voyage embeddings, Anthropic, Deepgram. Next up is a signed-in live QA pass and turning the visual connector stubs (Calendar/Gmail/Spotify, etc.) into real OAuth.

---

## What it is

**The problem:** General AI assistants don't know you. Every session starts from zero, and they don't adapt to how you actually learn or what you're working toward.

**The solution:** A "second self" that builds a durable model of you (facts, plans, preferences, learning style, skill tracks) and exposes it to your AI tools through a two-way MCP connector, so Claude/Cursor act with your context and write progress back.

**The user:** People who live in AI tools (Claude, Cursor) and want them personalized and accelerating, rather than generic.

**The value:** Your assistant compounds. It knows your context, coaches in your learning style, and tracks your skills across sessions and tools, instead of resetting every time.

---

## Status

- **Phase:** post-MVP iteration (v4 rebuild live)
- **Engagement manager:** self-directed
- **Lead:** Finley (finley@qsbsrollover.com)
- **Cadence:** continuous solo build; ship-as-you-go via PRs to main
- **Next milestone:** signed-in live QA pass on production; real OAuth for connectors beyond Drive/uploads
- **Flags:** shipping

---

## Where we are right now

The v4 learn-first rebuild is fully merged to main and auto-deployed to production. All eight phase PRs (#13-#21) are in: routing reframe, the flywheel + connector UI, the live MCP server with enforced scopes, the typed memory store, the self-rewriting overview, the sources/consent surface, chat auto-save + learning-style inference, and a final accessibility/motion/polish pass. The next concrete step is a real signed-in QA pass on production, since the build was verified in pieces but not yet end-to-end as a logged-in user. After that, the priority is converting the connector stubs (Calendar, Gmail, Spotify, etc.) from visual placeholders into real OAuth, and re-tightening the factory-review merge gate that was softened during active dev. One thing for the human to note: every PR touching auth/DB/AI surfaces escalated on review and was admin-merged with the owner's authorization, so the gate is currently looser than its fail-closed default.

---

## What's built

**Frontend / UI**
- New learn-first IA under an `(app)` route group: `/learn` (default landing), `/plugin`, `/chat`, `/overview`, `/memory`, `/sources`, `/settings` (`app/(app)/`).
- Post-sign-in lands on `/learn`. Old `/portal/*` routes 307-redirect to their new homes (`next.config.mjs`).
- Ported `.app`-scoped design system in `app/globals.css`; visual source of truth is `design/soultech.html` (warm-dark; amber = you/inputs, cyan = clone/machine; Fraunces + IBM Plex Mono + Hanken Grotesk).
- `/overview`: animated completeness ring, self-rewriting portrait (`lib/profile/portrait.ts`), facts, and gaps.
- `/memory`: typed records (FACT/PLAN/MEMORY/PREFERENCE) with filters and redact.
- `/sources`: Connections / Questionnaires / Uploads tabs, real upload pipeline, and gated sensitive consent.
- `/chat`: cyan clone replies streaming from `/api/chat`, auto-saved Fact/Plan/Preference chips, and learning-style inference triggered by the "How you learn best" questionnaire.
- `/plugin`: where a member creates their MCP connection, sets per-category read/write scopes and the master write-back gate, and copies the endpoint URL.
- Profile completeness derived in `lib/profile/completeness.ts`, driving the sidebar bar, the `/overview` ring, and empty-vs-populated states.

**Backend / data**
- Live two-way MCP server at `app/api/mcp/[token]/route.ts` (stateless Streamable HTTP / JSON-RPC; token is the auth, Clerk-exempt in `middleware.ts`).
  - Read tools: `get_profile`, `get_learning_style`, `get_memories`, `get_tracks`.
  - Write tools: `save_memory`, `advance_track`.
  - Per-category read/write scopes plus a master `canWriteBack` gate, persisted on the connection and enforced server-side (`lib/mcp/scope.ts`). Sensitive categories (health/financial/location) denied unless consented on `/sources`. Every call audited to `audit_log`.
- Schema (additive migrations 0001-0003 in `drizzle/`): `tracks`, `learning_styles`, `tool_connections` (per-user MCP connection with `token` + `tokenHash`, `scopeMatrix` jsonb, `canWriteBack`), and `memories.type` (FACT/PLAN/MEMORY/PREFERENCE). Questionnaire answers + sensitive consent + the `/overview` portrait live in `members.settings` (jsonb).
- Chat extract-and-save pipeline and learning-style inference (`lib/learning/infer.ts`). Real upload processing pipeline (`lib/uploads/`).

**Infrastructure**
- Vercel auto-deploys `main` (project `soultech`). DB migrations applied to Neon via `drizzle-kit migrate`.
- pgvector with an HNSW cosine index on `memories.embedding` (1024-dim, Voyage `voyage-3-large`).

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next 16 App Router + React 18 + TypeScript | `app/(app)/` route group |
| Auth | Clerk (`@clerk/nextjs` 7) | `middleware.ts`; MCP route Clerk-exempt |
| ORM / DB | Drizzle ORM on Neon serverless Postgres + pgvector | `lib/db/schema.ts`, HNSW cosine index |
| Embeddings | Voyage `voyage-3-large` (1024-dim) | `lib/models/generateEmbedding.ts` |
| LLM | Anthropic — Opus for chat, Haiku for extraction/inference/summary | `lib/models/`, `lib/prompts/` |
| Transcription | Deepgram | `lib/models/transcribe.ts` |
| Styling | Tailwind 3 + `.app`-scoped CSS design system | `app/globals.css`, `design/soultech.html` |
| Hosting | Vercel | auto-deploy on `main` |
| Tests | Vitest | `vitest.config.ts` |

---

## Integrations & MCPs

| Integration | Purpose | Cost | Status |
|---|---|---|---|
| Soultech MCP server (per-user) | Two-way connector: Claude/Cursor read profile/style/memories/tracks and write back memories + track progress | self-hosted (Vercel/Neon) | live |
| Clerk | Authentication for the app surface | unknown | live |
| Neon Postgres + pgvector | Primary datastore + vector retrieval | unknown | live |
| Voyage AI | `voyage-3-large` embeddings | usage-based | live |
| Anthropic | Opus (chat) + Haiku (extraction/inference/summary) | usage-based | live |
| Deepgram | Audio transcription | usage-based | live |
| Google Drive picker | Document/upload ingestion into sources | unknown | live |
| Calendar / Gmail / Spotify / other connectors | Future clone data sources | unknown | planned (visual stubs only) |

*Source: no MCP config files found in repo. This table was built from the live MCP server (`app/api/mcp/[token]/route.ts`), `package.json` dependencies, and the env var keys in `.env.local` (`CLERK_*`, `NEON_DATABASE_URL`, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `NEXT_PUBLIC_GOOGLE_*`).*

---

## Decisions log

The "why" behind key choices. Newest first.

- **2026-06-03 — Repositioned from inward "reflective clone" to outward "second self."** The portal-only reflection product had a weak value loop. The reframe makes the clone useful inside the tools the user already lives in (Claude/Cursor) via MCP, which is the differentiator. Rejected: continuing to polish the standalone portal.
- **2026-06-03 — The two-way MCP connector is the moat.** A live per-user MCP server (read profile/style/memories/tracks, write memories + track progress) is what general assistants can't replicate without your data. Built as stateless Streamable HTTP / JSON-RPC so it stays serverless-friendly on Vercel.
- **2026-06-03 — Token-as-auth for the MCP server, Clerk-exempt.** The MCP endpoint authenticates by connection token (with `tokenHash` stored), not a Clerk session, so external tools can call it. `middleware.ts` explicitly skips `/api/mcp(.*)`. The token is revocable/rotatable.
- **2026-06-03 — Per-category scopes + master write-back gate, enforced server-side.** Read/write is gated per category in `scopeMatrix`; sensitive categories (health/financial/location) stay denied until explicit consent on `/sources`. Enforcement lives in `lib/mcp/scope.ts`, not the client, and every call is audited.
- **2026-06-03 — Reuse the stack, rewrite the product.** Kept Next/Clerk/Drizzle/Neon/Voyage/Anthropic/Deepgram; only added additive migrations (0001-0003) and a new route group. Avoided a from-scratch rebuild.
- **2026-06-03 — Additive-only migrations and jsonb `members.settings` for soft data.** `memories.type` defaults to MEMORY for a safe migration; questionnaire answers, consent, and the overview portrait live in `members.settings` rather than new tables, to move fast without schema churn.
- **2026-06-03 — Keep old `/portal/*` links alive via redirects.** No dead bookmarks; the app stays deployable through the IA move (`next.config.mjs`).
- **2026-06-03 — Softened the factory-review merge gate during active dev (#12).** Reverses the fail-closed gate from #11 to reduce friction while shipping the rebuild. To be re-tightened (see Open loops). Every auth/DB/AI PR was admin-merged with owner authorization.

---

## Open loops

- [ ] Signed-in live QA pass on production end-to-end — Finley
- [ ] Real connector OAuth beyond Google Drive/uploads (Calendar, Gmail, Spotify, etc. are visual stubs) — Finley
- [ ] Multi-connection per-tool scope (currently one primary connection per member) — Finley
- [ ] Re-tighten the factory-review merge gate back to fail-closed (softened in #12) — Finley
- [ ] Refresh `README.md` (still describes the old landing-page-only product) — Finley

---

## Risks & known issues

- No signed-in live QA pass yet; the rebuild was verified in pieces, not end-to-end as a logged-in user.
- Factory-review gate is currently softened; auth/DB/AI PRs were admin-merged with owner authorization rather than passing the fail-closed gate.
- Connectors beyond Drive/uploads are visual stubs, not functional OAuth integrations.
- Only one primary MCP connection per member is supported; multi-connection per-tool scoping is not built.
- The MCP token is a bearer capability in the endpoint URL — leaking it grants scoped access until revoked.
- `README.md` is stale and describes the pre-rebuild landing page.

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

- **2026-06-03:** Initial PROJECT.md superdoc created capturing the v4 learn-first rebuild (PRs #13-#21) live on production.
- **2026-06-03:** Phase 4 — Craft: accessibility, motion, polish (#21).
- **2026-06-03:** Phase 3b-4 — `/chat` auto-save + learning-style inference (#20).
- **2026-06-03:** Phase 3b-3 — `/sources` (connections, questionnaires, uploads) + consent (#19).
- **2026-06-03:** Phase 3b-2 — `/overview` (ring, self-rewriting summary, facts, gaps) (#17).
- **2026-06-03:** Phase 3b-1 — `/memory` typed records + `memories.type` (#16).
- **2026-06-03:** Phase 3a — live two-way MCP server + enforced scope (#15).
- **2026-06-03:** Phase 2 — the flywheel + MCP connector on `/plugin` (#14).
- **2026-06-03:** Phase 1 — learn-first reframe: routing, design system, Learn page (#13).
