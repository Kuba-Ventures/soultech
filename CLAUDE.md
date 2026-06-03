# soultech

## Merge policy

This repo runs a supervised PR factory. A PR auto-merges only when the factory review
returns `APPROVE-LOWRISK` against this policy. Auto-merge is **disabled** until the repo
variable `FACTORY_AUTOMERGE` is set to `true` (turned on after a supervised soak).

**Low-risk surfaces — eligible for auto-merge** (these are presentation/copy only and are
covered by tests in `lib/text.test.ts` and `components/*.test.tsx`):

- `app/page.tsx`, `app/how-it-works/**`, `app/use-cases/**` — marketing pages (copy + layout)
- `components/Logo.tsx`, `components/ChatMockup.tsx`, `components/ExchangeCard.tsx`,
  `components/SiteChrome.tsx` — presentational components
- `lib/text.ts`, `lib/brand.ts` — pure helpers / static brand config

**Always escalate to a human — never auto-merge, regardless of how small the change:**

- Anything touching auth, sessions, sign-in/out, Clerk, or member identity
  (`app/sign-in/**`, `app/sign-up/**`, `app/admin/**`, `components/LoginForm.tsx`,
  `components/LogoutButton.tsx`)
- Anything touching data: the database, schema, or migrations (`lib/db/**`, `drizzle/**`,
  `drizzle.config.ts`), uploads (`lib/uploads/**`), retrieval (`lib/retrieval/**`)
- Anything touching the AI behavior: prompts, models, onboarding logic
  (`lib/prompts/**`, `lib/models/**`, `lib/onboarding/**`), the chat/portal product
  (`app/portal/**`, `components/portal/**`)
- Any API route (`app/api/**`), `middleware.ts`, the waitlist (`components/WaitlistForm.tsx`)
- CI, workflows, build config, or dependency changes
- **Anything not explicitly listed as low-risk above**

This is a paying client's product. When in doubt, escalate. The reviewer
(`.claude/agents/pr-reviewer.md`) enforces this policy; tighten this block whenever
something slips through.

## Tests

`npm test` runs the Vitest suite (the factory's safety net). It covers the low-risk
surfaces above. Adding a low-risk surface to the policy means adding tests for it first.
