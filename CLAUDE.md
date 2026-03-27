# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TrainerGPT — AI hypertrophy training coach. The app lives in `trainergpt/`. All commands run from that directory.

**Production**: https://trainergpt.xyz
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

# Coach evals (18 scenarios, uses real Anthropic API)
npm run eval                             # Run all 18 evals
npm run eval:policy                      # Policy compliance only (5 scenarios)
npm run eval:tools                       # Tool usage patterns (5 scenarios)
npm run eval:edge                        # Edge cases (5 scenarios)
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
| `src/lib/ai.ts` | System prompt (XML-structured), `buildSystemPrompt()` with optional briefing injection |
| `src/lib/briefing.ts` | `generateSessionBriefing(userId)` — gathers profile/volume/history/progression data, returns XML for system prompt |
| `src/app/api/chat/route.ts` | AI chat endpoint — 11 tools, `streamText`, `stopWhen: stepCountIs(10)`, session briefing |
| `src/lib/cache.ts` | Redis caching: volume, profile, exercises, weekly summary, deload |
| `src/lib/db/schema.ts` | 6 Drizzle tables + relations |
| `src/lib/db/index.ts` | Lazy DB connection via Proxy (builds work without env vars) |
| `src/lib/flags.ts` | Feature flags (ai-model only; others shipped to all users) |
| `src/components/ui/status-dot.tsx` | Geist-style StatusDot (active/completed/planned/abandoned/error/ready) |
| `src/components/ui/loading-dots.tsx` | Geist-style LoadingDots (bouncing dots for typing indicators) |
| `src/app/(app)/coach/_components/coach-client.tsx` | Chat UI using `useChat` |
| `src/app/(app)/_components/mobile-nav.tsx` | Mobile bottom tab bar (4 tabs, active route indicator) |
| `src/app/(app)/_components/sidebar-nav.tsx` | Desktop sidebar nav with active route highlighting |
| `src/app/(app)/workout/_components/prescribed-workout.tsx` | Workout view: exercise cards, set logging, mesocycle header |
| `src/app/(app)/workout/_components/exercise-set-row.tsx` | Set row states: completed (w/ set type badge), active (inputs + set type toggle), upcoming |
| `src/app/(app)/workout/_components/exercise-menu.tsx` | Sheet menu: Add Set, Skip Remaining, Notes |
| `src/app/(app)/workout/_components/exercise-info-sheet.tsx` | Exercise info bottom sheet (muscles, SFR, movement pattern, rest) |
| `src/app/(app)/workout/_components/rest-timer-banner.tsx` | Sticky rest timer with countdown + GO state |
| `src/app/(app)/workout/_components/muscle-group-badge.tsx` | 14 muscle groups with distinct color badges |
| `src/app/(app)/workout/_components/types.ts` | Shared types: SetType, LoggedSet, PreviousSetData, ExerciseDetail, etc. |
| `src/app/(app)/workout/actions.ts` | Server actions: log sets, complete workout, previous performance |
| `evals/` | Coach eval framework (types, fixtures, scenarios, runner) |
| `docs/hypertrophy_training_reference.md` | Full training science reference |

### Data Flow

```
Client (useChat/sendMessage) → /api/chat POST
  → Per-user rate limit (10/min) → generateSessionBriefing(userId)
  → buildSystemPrompt({ sessionBriefing, advancedCoaching })
  → convertToModelMessages(messages) → streamText with 11 tools
  → Tools query Neon via Drizzle, cache via Upstash Redis
  → result.toUIMessageStreamResponse() → streaming back to client
```

### AI Chat Tools (11 total)

1. `getUserProfile` — Profile, volume landmarks (MEV/MAV/MRV), active mesocycle, deload recommendation
2. `getWorkoutHistory` — Per-session summaries (not raw sets) filtered by muscle group/exercise
3. `getVolumeThisWeek` — Weekly volume with computed `status` and `setsRemaining` per muscle group
4. `getProgressionTrend` — Per-session averages + recommendation for an exercise
5. `getExerciseLibrary` — Search exercises by comma-separated muscleGroups, returns `{id, name, equipment}`
6. `prescribeWorkout` — Creates session after validating exercise IDs + volume vs MRV
7. `logWorkoutSet` — Logs a set to the active session (fuzzy exercise name match, supports setType)
8. `completeWorkoutSession` — Marks session completed/abandoned with duration
9. `updateUserProfile` — Updates experience level, training days, split, equipment (only on explicit request)
10. `createProgram` — Generates full mesocycle with session plan, materializes week 1
11. `advanceWeek` — Advances mesocycle to next week, materializes sessions

### System Prompt Structure (`src/lib/ai.ts`)

The prompt uses XML sections: `<background_information>`, `<session_briefing>` (injected dynamically), `<instructions>` (6 hard rules including proactive coaching), `<tool_guidance>`, `<output_format>`, `<edge_cases>`, `<examples>`. Built via `buildSystemPrompt()` which accepts optional briefing XML and always includes the advanced coaching addendum.

### Session Briefing System (`src/lib/briefing.ts`)

On every chat request, `generateSessionBriefing(userId)` gathers cached profile, volume, deload, and recent workout data in parallel. It computes: mesocycle position, volume status per muscle group, muscle groups below MEV, progression flags (stall/overreach/ready-to-increase), deload status, and a prioritized recommendation. The result is formatted as `<session_briefing>` XML injected into the system prompt between `<background_information>` and `<instructions>`. The coach client auto-sends "Hey coach, what's the plan?" on mount, and the proactive coaching instruction tells the LLM to lead with its most actionable insight rather than waiting for the user to ask. Returns null gracefully for new users or on failure.

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
  stopWhen: stepCountIs(10),  // NOT maxSteps
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
- **Volume cache** (`getCachedVolume`) correctly counts only hard sets (RIR ≤ 4) — verified in test suite
- **`vercel env pull`** overwrites `.env.local` — add keys to Vercel dashboard instead

## Coach Agent Tuning

Current eval score: **18/18 (100%), 61/61 policy assertions (100%)**. The eval framework in `evals/` uses `generateText` with mock tools (including leg exercises) + a Haiku judge for natural language policy assertions. `getExerciseLibrary` accepts comma-separated `muscleGroups` for batching. Step limit is 10 (raised from 7 to support complex prescription flows).

### Proactive Coaching

The coach is proactive, not reactive. On first visit per browser session, the client auto-sends a trigger message. The session briefing (cached 10 min in Redis) provides the coach with volume status, progression flags, and a prioritized recommendation. Rule 6 in the system prompt instructs the coach to lead with its most actionable insight.

### Security

All server actions verify ownership (userId match) before mutations. DB has partial unique indexes preventing duplicate active sessions/mesocycles per user. Redis operations are wrapped in try/catch (fail-open). Per-user rate limiting (10 msg/min) on `/api/chat`. exercise_sets have CASCADE DELETE on session FK.

## Environment Variables

Required in `trainergpt/.env.local` and Vercel dashboard:
```
POSTGRES_URL, KV_REST_API_URL, KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN,
ANTHROPIC_API_KEY, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
```
Optional: `EDGE_CONFIG` (for feature flags via Edge Config)

> **Auth note**: NextAuth v5 uses `AUTH_SECRET` (not `NEXTAUTH_SECRET`). No `NEXTAUTH_URL` needed in production — Vercel auto-detects via `VERCEL_URL`. GitHub OAuth callback URL must match production domain (`https://trainergpt.xyz/api/auth/callback/github`).

## Project Tracking — Notion

**All work must be tracked in the [TrainerGPT — SLC Tracker](https://www.notion.so/2e97a56144dd43b690f145411aa0f1aa) Notion database.**

After completing any of the following, add or update the corresponding task in Notion via the Notion MCP (`mcp__plugin_Notion_notion`):
- New feature built
- Bug fixed
- UI change (including mobile UX fixes, layout changes, design polish)
- Tech debt addressed
- New bug discovered (add as `Backlog` with type `Bug`)

Use data source ID `60257600-8325-42d2-8500-5c9c7ee71bbb` when creating rows. Update task Status to `Done` when work is complete. If work surfaces a new task not already on the board, add it.

### Field Notes

**[TrainerGPT — Field Notes](https://www.notion.so/320d631d7a4d814c82ffd0f0cdff2b94)** is a freeform Notion page where Ryan dumps screenshots, bugs, ideas, and observations from the gym via his phone.

**At the start of every session**, fetch this page via the Notion MCP (`mcp__plugin_Notion_notion__notion-fetch`) and check for new content. If there are new notes or screenshots:
1. Discuss them with Ryan to understand context and intent
2. Triage into actionable work — create tasks on the SLC Tracker board, fix bugs directly, or flag for discussion
3. After processing, delete the handled notes from the page entirely — SLC Tracker + git history are the record. Keep the page clean for the next dump.
