# Open questions

Stashed during build; revisit before pilot.

## UI / UX
- **Interviewer chat polish.** Auto-resize textarea height as content grows, message timestamps in hover state, ability to delete a turn, "new conversation" button to start a separate interviewer session.
- **Multiple conversations.** Current model uses one ongoing `AI Interviewer` conversation per member. Build plan's left sidebar mentions "conversation history". Decide: rename single conversation per session/date, OR keep one rolling stream.
- **Citation UI for reflective chat (Phase 3) is unspecified visually.** Inline footnotes vs side panel vs hover cards.

## Ingestion
- **Raw upload storage.** v1 currently discards raw bytes after extraction. Build plan calls for S3-compatible storage (R2 preferred). Pick: Vercel Blob (zero setup, costs more), Cloudflare R2 (best egress, ~10 min setup), or punt to Phase 4.
- **Large-file upload pipeline.** Synchronous server-action approach works for short docs and short audio. PDFs over ~30 pages or audio over ~5 min may hit Vercel's 300s ceiling. When we hit it: introduce Inngest (or similar) and move ingestion to background jobs.
- **Chunking strategy refinement.** Currently paragraph-based for text, Deepgram-paragraph for audio. May want sentence-level for dense documents or semantic-chunking via an LLM for narrative-heavy text.
- **Duplicate detection on re-upload.** No de-dup yet. If a member uploads the same PDF twice we get duplicate memories.

## Retrieval / reflective layer (Phase 3 prep)
- **Pattern detection prompt design.** Haiku pre-pass: what exactly counts as a "pattern"? Recurring theme, contradiction, similar past decision, repeated vocabulary?
- **Style profile regeneration trigger.** Build plan says "regenerate when the corpus grows materially." Define "materially": +N memories, +X% growth, time-bounded?
- **Retrieval ranking signals.** Beyond cosine similarity + recency, what signals do we surface? Member-confirmed-relevant citations? Memory age? Source type weighting?

## Auth + access
- **Sign-up gating.** Currently anyone can sign up via Clerk. For private beta, restrict to invite-only (Clerk's allowlist feature or a custom waitlist-to-invite flow).
- **Account deletion semantics.** Build plan says "danger-zone account deletion (full corpus wipe with confirmation)." Clarify: cascade FK already handles tables, but do we also need to delete uploads from object storage once that's wired?

## Ops
- **Old /admin routes cleanup.** /admin, /admin/login, /api/admin/* are dead now that Clerk + /portal are live. Pending user confirmation to delete.
- **Vercel preview env vars.** Production env vars are set on the org project. Preview deploys for branches won't have them. Decide whether to mirror to Preview environment.
- **Apps Script waitlist webhook.** Still functional; revisit when we wire signup invites or want to deprecate the waitlist Sheet.
