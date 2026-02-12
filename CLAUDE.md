# TrainerGPT — AI Hypertrophy Training Coach

## Project Overview

TrainerGPT is an AI-powered hypertrophy training coach built on Next.js 15 and deployed to Vercel. It uses the Vercel AI SDK with Claude to provide conversational coaching, generate workout prescriptions, track progressive overload, and autoregulate training based on user feedback. The project serves as a Vercel platform showcase for interview preparation.

## Tech Stack

| Layer | Technology | Package |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | `next` |
| Language | TypeScript (strict) | `typescript` |
| AI | Vercel AI SDK + Anthropic Claude | `ai`, `@ai-sdk/anthropic` |
| Database | Neon Postgres + Drizzle ORM | `@neondatabase/serverless`, `drizzle-orm` |
| Cache/Sessions | Upstash Redis | `@upstash/redis` |
| File Storage | Vercel Blob | `@vercel/blob` |
| Styling | Tailwind CSS + shadcn/ui | `tailwindcss`, `@shadcn/ui` |
| Validation | Zod | `zod` |
| Auth | NextAuth.js v5 | `next-auth` |

> **IMPORTANT**: Vercel Postgres and Vercel KV are deprecated. Always use Neon (Postgres) and Upstash (Redis) via Vercel Marketplace. Never import from `@vercel/postgres` or `@vercel/kv`.

## Architecture

### App Router Structure

```
app/
├── (auth)/                    # Auth route group (login, signup)
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (app)/                     # Authenticated app routes
│   ├── layout.tsx             # App shell with sidebar
│   ├── dashboard/page.tsx     # Overview: current meso, recent workouts, stats
│   ├── workout/
│   │   ├── page.tsx           # Active workout logger
│   │   └── [sessionId]/page.tsx  # Past workout detail
│   ├── program/
│   │   ├── page.tsx           # Current mesocycle overview
│   │   └── [mesoId]/page.tsx  # Mesocycle detail
│   ├── coach/page.tsx         # AI coaching chat (full page)
│   └── history/page.tsx       # Workout history & progress charts
├── api/
│   ├── chat/route.ts          # AI chat endpoint (streamText + tools)
│   ├── workout/route.ts       # Workout CRUD
│   ├── program/route.ts       # Mesocycle generation
│   └── auth/[...nextauth]/route.ts
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing page (static/ISR)
└── not-found.tsx
```

### Data Flow

```
User Input → Client Component (useChat / forms)
           → API Route (serverless function)
           → AI SDK (streamText/generateObject with tools)
           → Tools query Neon Postgres via Drizzle
           → Streaming response back to client
           → Cache hot data in Upstash Redis
```

### Rendering Strategy

| Route | Strategy | Why |
|-------|----------|-----|
| `/` (landing) | Static | Never changes |
| `/dashboard` | SSR | User-specific, needs fresh data |
| `/workout` | CSR | Real-time interaction, forms |
| `/coach` | CSR + Streaming | AI chat with streaming responses |
| `/history` | SSR | User-specific but read-heavy |
| `/program` | SSR | User-specific program data |

## Database Schema (Drizzle)

Core tables (defined in `lib/db/schema.ts`):

- **users** — id, email, name, experience_level, created_at
- **mesocycles** — id, user_id, name, start_date, end_date, split_type, status (active/completed/planned)
- **workout_sessions** — id, user_id, mesocycle_id, date, session_name, pre_readiness (JSON), post_notes, duration_minutes
- **exercise_sets** — id, session_id, exercise_id, set_number, weight, reps, rir, rpe, rest_seconds, notes
- **exercises** — id, name, muscle_groups (JSON), movement_pattern, equipment, sfr_rating, rep_range_optimal (JSON)
- **user_volume_landmarks** — id, user_id, muscle_group, mev, mav, mrv (personalized over time)

## AI Integration Rules

### Chat Endpoint (`/api/chat/route.ts`)

- Use `streamText` from `ai` with `anthropic('claude-sonnet-4-5-20250929')`
- Define tools with Zod schemas for:
  - `getWorkoutHistory` — query past sessions for a muscle group
  - `getVolumeThisWeek` — calculate current weekly volume per muscle group
  - `getProgressionTrend` — compare performance across sessions
  - `getUserProfile` — fetch user preferences and volume landmarks
- Set `maxToolRoundtrips: 5` to allow multi-step reasoning
- System prompt includes hypertrophy coaching persona + training science rules

### Workout Prescription (`/api/program/route.ts`)

- Use `generateObject` with Zod schema for structured workout plans
- Schema defines exercises with sets, rep ranges, RIR targets, rest periods
- AI considers: user's volume landmarks, current mesocycle week, recent performance, recovery indicators

### System Prompt Principles

The AI coach should:
1. Base recommendations on evidence (RP Strength, Schoenfeld, Helms)
2. Track volume per muscle group against MEV/MAV/MRV landmarks
3. Use RPE/RIR for autoregulation
4. Recommend progressive overload (weight → reps → sets)
5. Trigger deloads proactively (every 4-6 weeks) or reactively (performance decline, poor recovery)
6. Explain the "why" behind every recommendation

## Coding Conventions

### General
- Use TypeScript strict mode everywhere
- Prefer Server Components; only use `'use client'` when needed (forms, hooks, interactivity)
- Use `@/` path alias for imports (maps to project root)
- Use Zod for all validation (API inputs, AI outputs, form data)
- Error boundaries via `error.tsx` in route segments

### Database
- All queries go through Drizzle ORM — never raw SQL
- Schema changes require migration: `npx drizzle-kit generate` then `npx drizzle-kit migrate`
- Use `drizzle-orm/neon-http` driver (edge-compatible)
- Relation queries via `db.query.tableName.findMany({ with: { ... } })`

### AI SDK (v6)
- Chat routes return `result.toUIMessageStreamResponse()`
- Tools use `tool()` from `ai` with `inputSchema` (not `parameters`) accepting Zod schemas
- `execute` function signature: `async (input, options) => result` — destructure input inline
- Multi-step tool calling: `stopWhen: stepCountIs(N)` (not `maxSteps`)
- Client: `useChat` from `@ai-sdk/react` — returns `{ messages, sendMessage, status }`, NOT `input`/`handleInputChange`/`handleSubmit`/`isLoading`
- Messages use `parts` array (e.g. `{ type: 'text', text: '...' }`) — no `content` string property
- Loading state: check `status === 'streaming' || status === 'submitted'`
- Structured outputs use `generateObject` with Zod schemas, never string parsing
- Handle tool results in the streaming response, not as separate API calls

### Components
- Use shadcn/ui components as base (installed via `npx shadcn-ui@latest add [component]`)
- Scaffold complex UI with v0.dev first, then customize
- Keep components in `components/` at project root
- Page-specific components in `app/[route]/_components/`

### Git & Deployment
- Push frequently — every push triggers a Vercel preview deployment
- Use feature branches for major features
- Preview deployments are part of the workflow — share preview URLs for feedback

## Reference Documents

- `vercel-ai-sdk-guide.md` — Comprehensive AI SDK patterns and code examples
- `hypertrophy_training_reference.md` — Training science, data models, AI decision trees

## Environment Variables

Required in `.env.local` and Vercel dashboard:

```
POSTGRES_URL=              # Neon Postgres connection string
KV_REST_API_URL=           # Upstash Redis REST URL
KV_REST_API_TOKEN=         # Upstash Redis token
BLOB_READ_WRITE_TOKEN=     # Vercel Blob token
ANTHROPIC_API_KEY=         # Claude API key
NEXTAUTH_SECRET=           # NextAuth secret
NEXTAUTH_URL=              # App URL (http://localhost:3000 for dev)
```
