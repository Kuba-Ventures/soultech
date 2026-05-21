# Soultech Member Portal : Build Prompt for Claude Code

## How to use this prompt

This is a foundational prompt for building Soultech's v1 product. You can use it in two ways:

1. **All at once** : paste the entire prompt to Claude Code at project start. It will internalize the architecture, conventions, and phased plan, then execute the v1 phases in order.
2. **Modularly** : paste the "Project context" section once at the start of a session, then paste individual "Phase" sections as you're ready to build each piece. This is the recommended approach for a build of this scope.

If using Claude Code, run `/init` first to generate a `CLAUDE.md` for the repo, then commit this prompt as `BUILD_PLAN.md` so Claude has persistent access to the plan across sessions.

---

## Project context

You are building **Soultech**, a member-only web application that gives each member a personal AI clone trained on the corpus of their own life : conversations, decisions, writing, and reflections. The product's the *reflective learning loop*: the clone doesn't just answer questions, it studies how the member thinks and feeds it back as coaching, pattern recognition, and personalized teaching.

This is **v1 : Reflective core**. The goal is a member can sign in, feed the system meaningful inputs (conversation, uploaded documents, voice memos), and have a genuinely useful reflective conversation grounded in their own corpus. Capture automation (meeting bots, OAuth connectors) and durability features (export, key management, voice synthesis) are out of scope for v1 : they ship in v2 and v3.

### Product principles

- **The reflective layer is the product.** Generic Q&A over uploaded docs is not the goal. Every feature should make the member feel the system *knows them* : surfaces gaps in their reasoning, notices patterns over time, coaches them in their own voice. If a feature could ship in ChatGPT with file upload, it's not differentiated enough.
- **Member-first, not creator-first.** Delphi and Personal.ai optimize for outbound (your clone talks to your audience). Soultech optimizes for inbound (your clone talks to *you*). UI, prompts, and features should reflect this.
- **Trust is foundational.** The corpus is intimate. Every flow should give the member control: clear consent on what enters the corpus, easy edit and redact, transparent retrieval ("this answer drew on these memories").
- **The corpus is the moat.** Schema decisions should favor portability and longevity. Raw inputs preserved alongside derived data. Open formats. Audit log of every write.

### Architecture

**Frontend:** Next.js 15 (App Router) + TypeScript, Tailwind CSS, shadcn/ui components. Server components by default; client components only where interactivity demands it.

**Auth:** Clerk for member authentication. Single-tenant model isolation for v1 (each member's corpus is fully isolated; multi-tenant orgs are v3+).

**Backend:** Next.js API routes + server actions for the portal. Heavier processing (transcription, embedding generation) runs as background jobs via Inngest or a similar queue.

**Database:** Postgres (Neon or Supabase) with `pgvector` extension for embeddings. Drizzle ORM for type-safe queries.

**Object storage:** S3-compatible (Cloudflare R2 preferred for egress economics) for raw media : uploaded audio, original documents.

**Models:** Anthropic Claude as the primary model. **Wrap every model call in a single `generateResponse()` abstraction** so future swaps require touching one file. Use the Claude API directly with a thin internal client; do not call from the frontend.

**Embeddings:** Voyage AI (or OpenAI `text-embedding-3-large` as fallback). Same abstraction principle : wrap in `generateEmbedding()`.

**Transcription:** Deepgram (real-time + batch). Wrap in `transcribe()`.

### Coding conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- Server actions for mutations; API routes only for webhooks and streaming.
- Zod for all input validation at trust boundaries (API routes, server actions, model output parsing).
- Tailwind utility classes; no separate CSS files except `globals.css`.
- Component files: one component per file, named export matching filename.
- Database queries: always through Drizzle, never raw SQL except for vector similarity (and that goes through a typed helper).
- Errors: throw `AppError` with a typed code; surface user-safe messages at the boundary.
- No console.log in committed code; use a `logger` utility that ships to a real log sink.
- Tests: Vitest for unit, Playwright for critical-path E2E (sign in → upload → chat). Skip exhaustive test coverage for v1, but cover the corpus write path and the retrieval path.

### Data model (canonical)

The corpus is composed of `Memory` records. A `Memory` is the smallest addressable unit : one transcribed conversation segment, one uploaded document chunk, one journal entry.

```
members
  id, clerk_id, email, created_at, settings (jsonb)

memories
  id, member_id, source_type (enum: 'chat'|'upload_doc'|'upload_audio'|'voice_memo'),
  source_id (groups memories from same upload),
  content (text), content_summary (text, ~1 sentence),
  embedding (vector(1024)),
  occurred_at (when the event described happened, nullable),
  created_at (when it entered the corpus),
  metadata (jsonb : speaker, location, mood tags, etc.),
  redacted (bool, default false),
  redaction_reason (text, nullable)

sources
  id, member_id, source_type, original_filename, storage_key,
  status (enum: 'processing'|'ready'|'failed'),
  created_at, processed_at

conversations
  id, member_id, title, created_at, last_message_at

messages
  id, conversation_id, role (enum: 'member'|'clone'),
  content, citations (jsonb : array of memory_ids referenced),
  created_at

audit_log
  id, member_id, actor (enum: 'member'|'system'),
  action (text), target_type, target_id, details (jsonb), created_at
```

**Why this shape:** raw + derived are both preserved. `content_summary` lets you do cheap LLM filtering before expensive retrieval. `occurred_at` vs `created_at` lets you "what was I thinking about in March" even when the upload happened in November. `citations` makes retrieval transparent in the UI.

### The reflective layer : what makes this hard

This is where engineering effort should concentrate. A naive RAG implementation will feel like "ChatGPT with my docs." The reflective layer needs:

1. **Pattern detection across the corpus.** When a member asks a question, the system should not just retrieve relevant memories : it should look for *patterns*. "You've considered this kind of decision three times before. Each time you went with the safer option. Want to talk about that?"

2. **Voice mimicry without voice synthesis.** Text-mode v1 still needs the clone to *sound* like the member. The system prompt for the reflective chat should include a dynamically-generated style guide derived from the member's own writing : their typical sentence length, vocabulary, hedges, intensifiers, characteristic phrases.

3. **Gap-aware questioning.** When the member's input is shallow or the corpus is thin on a topic, the clone should ask a clarifying question rather than hallucinate context. Build this into the system prompt and validate model outputs for "I don't know enough about X yet : tell me more about…" patterns.

4. **Transparent retrieval.** Every response shows which memories it drew from. Members can click a citation to see the source memory and either confirm it ("yes, that's relevant") or redact it ("this shouldn't have surfaced"). Both signals feed back into retrieval ranking.

---

## Phase 1 : Foundation (Week 1)

Build the skeleton: auth, database, basic shell.

### Tasks

1. Initialize Next.js 15 project with TypeScript, Tailwind, shadcn/ui. Configure path aliases (`@/`).
2. Set up Clerk authentication with member sign-up, sign-in, and a protected `/portal` route group.
3. Provision Postgres (use Neon for dev) with `pgvector` extension. Set up Drizzle with the schema above. Generate and run initial migrations.
4. Build the portal shell: top nav with member name + sign-out, left sidebar for conversation history, main content area, settings page stub.
5. Create the `lib/models/` directory with `generateResponse.ts`, `generateEmbedding.ts`, `transcribe.ts` : each a thin wrapper around the relevant API. Each accepts a typed input and returns a typed output. Export from `lib/models/index.ts`.
6. Set up the audit log helper : a single `logAudit(memberId, action, details)` function used everywhere a write happens.

### Acceptance criteria

- A member can sign up, sign in, and land on `/portal` which shows their email and an empty state.
- The database has all tables from the schema. Drizzle can read and write to each.
- `generateResponse({ system, messages })` returns a Claude response. `generateEmbedding(text)` returns a 1024-dim vector. Both are tested.
- Every write to the database creates an audit log entry.

---

## Phase 2 : Ingestion (Week 2)

Get content into the corpus from the two simplest sources: in-portal chat and file upload.

### Tasks

1. Build the **conversational input** flow ("AI Interviewer" pattern). A `/portal/reflect` route with a chat interface. Each member message becomes a `Memory` with `source_type='chat'`. The clone's responses are stored as `messages` rows but not as `memories` (the corpus reflects the member, not the clone).
2. The conversational input has a distinct system prompt focused on *eliciting depth*: ask follow-up questions, probe for specifics, surface contradictions gently. This is different from the reflective chat (Phase 3) which is read-oriented.
3. Build **file upload** for: text documents (md, txt, pdf), audio (mp3, m4a, wav). PDFs extracted with `pdf-parse`. Audio sent to Deepgram for transcription.
4. Each upload creates one `source` row and N `memory` rows (chunked by paragraph for text, by speaker turn or 60s windows for audio). Each memory gets a content summary (1 sentence, Claude Haiku for cost) and an embedding.
5. Processing runs as a background job. The UI shows status ("processing" → "ready") with optimistic feedback.
6. Build the **memory dashboard** at `/portal/memories`: paginated list of all memories with filters by source type and date. Each row shows the summary, source, date, and an "edit" / "redact" button. Redact sets the `redacted` flag and excludes from future retrieval but preserves the row for audit.

### Acceptance criteria

- A member can chat with the AI Interviewer and have those messages stored as memories with embeddings.
- A member can upload a PDF or audio file and see it chunked into memories within ~60 seconds for a typical input.
- The memory dashboard shows all memories, filters work, redact works and is reflected immediately.
- Every memory has a non-null summary and embedding.

---

## Phase 3 : Reflective chat (Weeks 3–4)

This is the heart of the product. Spend disproportionate effort here.

### Tasks

1. Build the **reflective chat** at `/portal/chat`. Distinct from the AI Interviewer : this is where the member talks *with* their clone, not feeds it.
2. Implement **retrieval**: on each member message, embed it, do vector similarity against the member's non-redacted memories, return the top 8–12. Layer on lightweight recency boosting and metadata filters when the query implies them ("last March", "with Sarah").
3. Build the **style profile**. On first message after a corpus has ≥50 memories, generate a dynamic style guide from the member's own writing (use a separate Claude call with a clear extraction prompt). Cache it. Regenerate when the corpus grows materially.
4. Build the **pattern detection step**. Before the main response, run a fast Claude Haiku pass: given the retrieved memories, are there patterns relevant to the current question (recurring themes, similar past decisions, contradictions)? Pass these as additional context to the main response.
5. Compose the reflective chat **system prompt**. It should include: (a) the style profile, (b) instruction to coach not just answer, (c) instruction to ask clarifying questions when corpus is thin, (d) instruction to cite memories by ID, (e) instruction to surface patterns when they're meaningfully present.
6. Build the **citation UI**. Inline citation markers in the response; clicking opens a panel showing the source memory with options to confirm relevance or redact.
7. Stream responses with `streamText` from the Vercel AI SDK or Anthropic's streaming SDK directly.

### Acceptance criteria

- A member with a populated corpus can ask a reflective question and get a response that (a) references specific memories with clickable citations, (b) sounds in their voice if their corpus is large enough, (c) asks a clarifying question rather than hallucinating when the corpus is thin.
- The pattern detection step surfaces a relevant pattern at least once in a 10-message conversation with a member who has a 100+ memory corpus.
- Redacting a memory from a citation immediately removes it from retrieval; the next response no longer cites it.

---

## Phase 4 : Polish and pilot prep (Week 5)

Tighten the experience for the first pilot members.

### Tasks

1. Onboarding flow: first sign-in walks the member through (a) what the product does, (b) the first AI Interviewer conversation (10–15 minutes minimum), (c) optional first upload. The first conversation seeds the style profile.
2. Settings page: profile, corpus size and stats, danger-zone account deletion (full corpus wipe with confirmation).
3. Email digest job (daily, opt-in): a Claude-generated 2–3 sentence summary of "what your clone noticed in your corpus today." Skip if no new memories.
4. Rate limits and abuse protection: per-member daily message cap, per-member upload size cap, Clerk's bot protection on auth.
5. Telemetry: log every reflective chat turn with retrieval IDs, pattern detection output, and response. This is for tuning, not surveillance : store anonymized aggregates in a separate analytics db.
6. Critical-path E2E test in Playwright: sign up → AI Interviewer for 5 messages → upload a document → reflective chat that cites the upload.

### Acceptance criteria

- A new member completes onboarding and has a meaningful first reflective chat within 30 minutes of sign-up.
- Settings work, including account deletion which cascades to all member data.
- The Playwright E2E test passes in CI.

---

## What's deliberately not in v1

Be vigilant about scope creep. The following are explicitly v2+ and should be punted on if they come up:

- Meeting bot ingestion (Recall.ai)
- OAuth connectors (Gmail, Calendar, Drive)
- Voice synthesis (ElevenLabs)
- Corpus export
- User-held encryption keys
- Legacy / inheritance flows
- Multi-model routing UI
- Team / multi-tenant features
- Mobile app

If a feature seems to require one of these, find a v1 workaround (e.g., "upload your meeting transcript manually" instead of building meeting bot integration). Note the workaround in the relevant phase and move on.

---

## Working style notes for Claude Code

- Before starting a phase, read the existing codebase (don't assume what's there). Run the project locally and verify the previous phase works before building on it.
- When in doubt about a product decision, ask one focused question rather than guessing. The architecture is opinionated; product details inside the reflective layer are not : they're worth discussing.
- Commit at least once per task within a phase, with descriptive messages.
- If you propose deviating from this plan (e.g., choosing a different library, restructuring the schema), surface the proposal and the tradeoff before making the change.
- The reflective layer is where to invest extra iteration. Other layers should be solid but not over-engineered.

---

## Build notes (running log)

### Repo decisions (2026-05-20)
- **Repo strategy:** Single repo. Portal lives at `/portal/*` alongside the existing landing pages. Existing `/admin` (cookie-based "soultech" password) stays as-is for now; Clerk gates `/portal/*` exclusively.
- **Model abstraction:** Strict from day 1. Every Claude / Voyage / Deepgram call routes through `lib/models/*`. No SDK imports outside that directory.
- **Next.js version:** Repo is on Next.js 16 (not 15 as the plan states). Staying on 16; App Router APIs we use are stable across both.
- **Accounts:** Provisioned on demand. Phase 1 will pause for Clerk publishable + secret keys and a Neon DB URL when those tasks come up.
