# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TrainerGPT — AI hypertrophy training coach. The app lives in `trainergpt/`. All commands run from that directory.

**Production**: https://trainergpt.vercel.app
**Repo**: https://github.com/ryanxkh/trainergpt

## Commands

```bash
cd trainergpt

# Development
npm run dev                              # Next.js dev server (localhost:3000)
npm run build                            # Production build
npm run lint                             # ESLint
npx tsc --noEmit                         # Type check

# Database
npx drizzle-kit generate                 # Generate migration from schema changes
npx drizzle-kit migrate                  # Run pending migrations

# Coach evals (17 scenarios, uses real Anthropic API)
npm run eval                             # Run all 17 evals
npm run eval:policy                      # Policy compliance only (5 scenarios)
npm run eval:tools                       # Tool usage patterns (5 scenarios)
npm run eval:edge                        # Edge cases (4 scenarios)
npm run eval:comm                        # Communication quality (3 scenarios)
npx tsx evals/runner.ts policy-001       # Run single scenario by ID

# Git (requires gh auth setup-git before first push)
gh auth setup-git && git push
```

## Tech Stack

- Next.js 16.1.6 (App Router), React 19, TypeScript 5 (strict)
- AI SDK v6: `ai@6.0.82` + `@ai-sdk/anthropic@3.0.42` + `@ai-sdk/react@3.0.84`
- Drizzle ORM 0.45.1 + Neon Postgres (`@neondatabase/serverless`)
- Upstash Redis (`@upstash/redis`), Tailwind CSS v4 + shadcn/ui
- Auth: NextAuth.js v5 (`next-auth@5.0.0-beta.30`), Zod 4.3.6
- Feature flags via `flags` SDK + Edge Config adapter

> **Vercel Postgres and Vercel KV are DEPRECATED.** Use Neon + Upstash via Marketplace. Never import from `@vercel/postgres` or `@vercel/kv`.

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/ai.ts` | System prompt (XML-structured) + model config |
| `src/app/api/chat/route.ts` | AI chat endpoint — 7 tools, `streamText`, `stopWhen: stepCountIs(7)` |
| `src/lib/cache.ts` | Redis caching: volume, profile, exercises, weekly summary, deload |
| `src/lib/db/schema.ts` | 6 Drizzle tables + relations |
| `src/lib/db/index.ts` | Lazy DB connection via Proxy (builds work without env vars) |
| `src/lib/flags.ts` | Feature flags (ai-model, advanced-coaching, progress-charts, workout-timer) |
| `src/app/(app)/coach/_components/coach-client.tsx` | Chat UI using `useChat` |
| `src/app/(app)/_components/mobile-nav.tsx` | Mobile bottom tab bar (4 tabs, active route indicator) |
| `src/app/(app)/_components/sidebar-nav.tsx` | Desktop sidebar nav with active route highlighting |
| `src/app/(app)/workout/_components/prescribed-workout.tsx` | Workout view: exercise cards, set logging, mesocycle header |
| `src/app/(app)/workout/_components/exercise-set-row.tsx` | Set row states: completed, active (inputs), upcoming |
| `src/app/(app)/workout/_components/exercise-menu.tsx` | Sheet menu: Add Set, Skip Remaining, Notes |
| `src/app/(app)/workout/_components/rest-timer-banner.tsx` | Sticky rest timer with countdown + GO state |
| `src/app/(app)/workout/_components/muscle-group-badge.tsx` | 14 muscle groups with distinct color badges |
| `src/app/(app)/workout/_components/types.ts` | Shared types for workout components |
| `src/app/(app)/workout/actions.ts` | Server actions: log sets, complete workout, previous performance |
| `evals/` | Coach eval framework (types, fixtures, scenarios, runner) |
| `docs/hypertrophy_training_reference.md` | Full training science reference |

### Data Flow

```
Client (useChat/sendMessage) → /api/chat POST
  → convertToModelMessages(messages) → streamText with 7 tools
  → Tools query Neon via Drizzle, cache via Upstash Redis
  → result.toUIMessageStreamResponse() → streaming back to client
```

### AI Chat Tools (7 total)

1. `getUserProfile` — Profile, volume landmarks (MEV/MAV/MRV), active mesocycle, deload recommendation
2. `getWorkoutHistory` — Per-session summaries (not raw sets) filtered by muscle group/exercise
3. `getVolumeThisWeek` — Weekly volume with computed `status` and `setsRemaining` per muscle group
4. `getProgressionTrend` — Per-session averages + recommendation for an exercise
5. `getExerciseLibrary` — Search exercises, returns `{id, name, equipment}` only
6. `prescribeWorkout` — Creates session after validating exercise IDs + volume vs MRV
7. `logWorkoutSet` — Logs a set to the active session (fuzzy exercise name match)

### System Prompt Structure (`src/lib/ai.ts`)

The prompt uses XML sections: `<background_information>`, `<instructions>` (with HARD RULES), `<tool_guidance>`, `<output_format>`, `<edge_cases>`, `<examples>`. The `ADVANCED_COACHING_ADDENDUM` is toggled via the `enable-advanced-coaching` feature flag.

## AI SDK v6 Patterns

These are **verified working** patterns — do not use older API shapes:

```typescript
// Server: chat route
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
const result = streamText({
  model: anthropic(modelId),
  system: systemPrompt,
  messages: await convertToModelMessages(messages), // REQUIRED
  tools: { myTool: tool({ description: "...", inputSchema: z.object({...}), execute: async (input) => {...} }) },
  stopWhen: stepCountIs(7),  // NOT maxSteps
});
return result.toUIMessageStreamResponse(); // NOT toDataStreamResponse

// Client: useChat
const { messages, sendMessage, status } = useChat();
// NO input, handleSubmit, handleInputChange, isLoading
// Messages have parts array, NOT content string
// Loading: status === 'streaming' || status === 'submitted'
// Tool parts: part.type.startsWith("tool-"), properties flat on part
```

## Gotchas

- **Anthropic + Zod**: No `min()`/`max()` on Zod numbers — use `.describe()` instead
- **`convertToModelMessages()`** is required before `streamText` when using `useChat` on client
- **Next.js 16 revalidation**: `revalidateTag(tag, "default")` and `revalidatePath("/path", "page")` both require 2 args
- **Next.js 16 cacheComponents**: `cacheComponents: true` replaces PPR. All async data access must be in `<Suspense>` or `"use cache"` functions. Page components should be sync.
- **DB connection is lazy** via Proxy in `src/lib/db/index.ts` — builds succeed without `POSTGRES_URL`
- **`edgeConfigAdapter()`** crashes without `EDGE_CONFIG` env var — `flags.ts` uses conditional `require()`
- **exercises table** has NO unique constraint on name; `onConflictDoNothing` needs a unique target
- **Volume cache** (`getCachedVolume`) counts ALL sets, not just hard sets (RIR ≤ 4) — known data integrity issue
- **`vercel env pull`** overwrites `.env.local` — add keys to Vercel dashboard instead

## Coach Agent Tuning

The coach has been through a 3-phase tuning process (Audit → Eval → Improve). Current eval score: **16/17 (94%), 98% policy assertion rate**. The eval framework in `evals/` uses `generateText` with mock tools + a Haiku judge for natural language policy assertions. See `.claude/agents/coach-developer.md` for the specialized agent and full methodology.

## Environment Variables

Required in `trainergpt/.env.local` and Vercel dashboard:
```
POSTGRES_URL, KV_REST_API_URL, KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN,
ANTHROPIC_API_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL
```
Optional: `EDGE_CONFIG` (for feature flags via Edge Config)
