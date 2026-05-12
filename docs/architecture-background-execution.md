# Architecture note — mobile sleep / background execution

**Ticket:** [TGPT-3](https://linear.app/ryanhodge/issue/TGPT-3/architecture-note-mobile-sleep-background-execution) · **Status:** research / architecture only — no implementation in this doc.

## Current behavior hypothesis

Field reports: long coach runs (planning, multi-step tool chains) appear to "stop" when the phone goes to sleep or the user exits the browser. The model never finishes from the user's perspective, and on next open the chat is empty.

What is actually happening, grounded in code:

- The coach chat is a single HTTP request to `POST /api/chat` that returns an SSE-style UI message stream (`src/app/api/chat/route.ts:1018-1021`). The client consumes that stream via `useChat()` (`src/app/(app)/coach/_components/coach-client.tsx:25`).
- When the phone locks / Safari is backgrounded, the OS aggressively suspends JS execution and tears down idle TCP connections. The browser-side reader of the SSE stream stops receiving chunks, and on iOS the underlying connection is usually killed by the radio sleep / app lifecycle.
- The server-side `streamText` run may continue executing inside the Vercel function until either it finishes naturally, the request's `AbortSignal` fires, or the function's `maxDuration` ceiling kills it. No `maxDuration` is set on the route (`src/app/api/chat/route.ts:43`), so Vercel defaults apply (10s hobby / 15s pro default; 60/300s caps depending on plan). With `stopWhen: stepCountIs(10)` and 11 tools, runs can comfortably approach those ceilings.
- Tool side effects **do** persist even when the client disconnects: `prescribeWorkout`, `logWorkoutSet`, `completeWorkoutSession`, `createProgram`, `advanceWeek`, `updateUserProfile` all write to Neon via Drizzle inside their `execute` callbacks. So a workout the coach prescribed mid-run can survive even if the user never sees the "Here's your workout..." text.
- The assistant's natural-language reply and any further reasoning steps are lost — they exist only in the un-consumed half of a dead stream.
- On reload, the chat is empty because nothing is persisted. `useChat()` is called with no `id`, no `resume`, no custom transport (`src/app/(app)/coach/_components/coach-client.tsx:25`). The only durable client state is a `sessionStorage` flag that tracks whether the auto-trigger briefing has been sent (`src/app/(app)/coach/_components/coach-client.tsx:35-38`).

## Root cause

Three independent gaps, each of which is enough to cause the reported symptom:

1. **HTTP / SSE is the only transport.** The run's progress is delivered exclusively over the response body of the originating `POST /api/chat`. When the browser is suspended or the tab closes, that stream cannot be reattached — there is no `GET /api/chat?id=...` resume endpoint and no chat `id` flowing through the client (`src/app/api/chat/route.ts:43-71`, `src/app/(app)/coach/_components/coach-client.tsx:23-53`).
2. **Message history lives only in React state.** Nothing in the repo persists chat messages. `src/lib/db/schema.ts` has tables for users / exercises / mesocycles / workout_sessions / exercise_sets / user_volume_landmarks — no `chat_messages` or `chat_runs` table. So a full page reload starts from scratch.
3. **No checkpoint / resume primitive on the run.** `streamText` is invoked synchronously inside the request handler and its output is piped straight to the response (`src/app/api/chat/route.ts:68,1018-1021`). No `onFinish` writer, no Redis fanout, no run-id, no status row.

Secondary risk: `stopWhen: stepCountIs(10)` × Anthropic latency × Vercel's default `maxDuration` can independently truncate long runs even when the client is connected. We have no signal on p95 run duration today.

What **is** durable (and helpful):

- Upstash Redis is already in use for cached briefing / volume / profile / exercises / weekly-summary / deload / program (`src/lib/cache.ts:14-20`, `src/lib/briefing.ts:57-60,116`). It's an obvious substrate for stream buffering and run state.
- Vercel cron infra is already proven — two crons run today (`vercel.json` → `/api/cron/weekly-summary` Mon 9:00, `/api/cron/check-deload` daily 8:00).
- Neon Postgres + Drizzle migrations are already wired (`drizzle.config.ts`), so adding a `chat_messages` / `active_streams` table is a clean schema-change.

What is **not** present today and would need to be built:

- No service worker, no Web Push registration, no VAPID keys, no `serviceWorker.register` anywhere in `src/` or `public/`. The PWA manifest (`public/manifest.json`) is install-only (`display: standalone`).

## Options

### (a) Accept current behavior + UX cue

**Shape.** Add a hint on `/coach` while `status === 'streaming'` (e.g. "Keep your screen on while I think — long plans can take ~30s"). Optionally request `navigator.wakeLock.request('screen')` to keep the screen alive while streaming.

**Pros.** Zero backend work. Zero new infra. Ships in an afternoon.

**Cons.** Doesn't actually fix the bug — if the user locks their phone, the reply is still lost. `navigator.wakeLock` is unreliable on iOS Safari and is released the moment the tab is backgrounded. Doesn't help the "user closed the tab" case at all.

**Risks.** Users learn to distrust the coach for long plans. UX cue is a band-aid that masks rather than fixes the issue.

### (b) Persist run state server-side + resumable runs

**Shape.** Use the AI SDK v6 resumable-streams pattern (https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-resume-streams):

- Generate a stable `chatId` per coach conversation, pass it to `useChat({ id, resume: true })`.
- Persist UI messages to a new `chat_messages` table on `onFinish` (and ideally an `active_streams` row keyed by chat id).
- Add `POST /api/chat?id=...` that writes to a `resumable-stream` Redis pub/sub, and `GET /api/chat?id=...` that reattaches by reading the same stream.
- On `/coach` mount, hydrate `initialMessages` from Postgres so reload always shows the last reply, even if the originating stream died.

**Pros.** This is the canonical fix. Survives phone sleep, tab close, and full reloads. Keeps token-by-token streaming UX. Builds on infra we already have (Upstash + Drizzle/Neon + Anthropic). The smallest-v1 fix (final-message persistence + hydrate-on-mount) is a strict subset and can ship before the resume layer.

**Cons.** Largest refactor of the four. `useChat` call site must take a chat id, drop client-side `stop()` (AI SDK docs explicitly say `resume: true` is mutually exclusive with abort: https://sdk.vercel.ai/docs/advanced/stopping-streams), and the API route splits into POST-create + GET-resume halves. New schema, new Redis topics.

**Risks.** Mutual exclusion with `stop()` means we'd remove the existing stop button (`src/app/(app)/coach/_components/coach-client.tsx:221-229`). Stream buffering in Upstash has a small storage cost per active run. Race conditions if two devices open the same chat id simultaneously — need a "one writer" rule.

### (c) Background job + polling

**Shape.** `POST /api/chat` enqueues a job (QStash / Inngest / a Vercel cron-triggered worker), writes a `chat_runs` row with `status: 'running' | 'done' | 'failed'` and a `partial_output` column, returns the run id immediately. Client polls `GET /api/chat/runs/:id` every 1-2s and renders incremental output.

**Pros.** Bulletproof against any client disconnect — the run is fully decoupled from the originating request. Easy to reason about lifecycle. Plays well with Web Push notifications (option d).

**Cons.** Loses true token-by-token streaming — UX becomes "spinner... block of text... spinner... block of text". Adds a queue dependency (QStash / Inngest) that we don't have today. Local dev gets harder (need to run the worker). Higher latency overall.

**Risks.** Polling adds wasted requests; we'd want websockets or SSE for `runs/:id` anyway, which negates some of the simplicity. Cost per run goes up vs the current single-function model.

### (d) Push notifications via service worker / Web Push

**Shape.** Register a service worker, ask for notification permission, store the user's VAPID subscription. When a run completes server-side, push "Your coach is ready" → tap reopens the app, which fetches the persisted final message.

**Pros.** Solves the "I locked my phone and went to do my set" case — the user gets a tap-to-resume. Cheap once the SW + persistence layer exist.

**Cons.** Useless without either (b) or (c) underneath — the notification needs a persisted message to point at. iOS Safari only supports Web Push for installed PWAs (Add to Home Screen) as of 16.4 — most users will not have done this. Permission UX is fiddly. VAPID key management. We currently have zero service worker code in the repo (verified across `src/` and `public/`).

**Risks.** Notification fatigue. Users denying permission, after which we have no second-chance prompt. Cross-platform behavior divergence between iOS / Android / desktop browsers.

## Recommended smallest-v1 fix

Ship the lower half of (b) plus the UX cue from (a) — no full resume layer yet:

1. Add a `chat_messages` table keyed by `(userId, chatId, createdAt)` storing the AI SDK `UIMessage` JSON.
2. Generate a `chatId` on `/coach` mount (UUID, persisted in `localStorage` per device) and pass it to `useChat({ id })`.
3. Add `onFinish` in `src/app/api/chat/route.ts` that writes the final assistant message (and the user message that triggered it) to Postgres.
4. On `/coach` mount, load the most-recent N messages from the DB into `initialMessages`.
5. While `status === 'streaming'`, show a small "Keep your screen on — coach is thinking" hint and request `navigator.wakeLock`.

Net effect: if the stream dies mid-flight (phone sleep), the user reopens the app, the page reloads, and they see whatever the model finished — including any tool outputs that already wrote to Neon — instead of an empty chat. We keep the existing `stop()` button intact because we are not yet using `resume: true`.

Cost: one migration, ~50 lines in the route, ~20 lines in the client. No new infra.

## Longer-term robust fix

Promote the smallest-v1 to full **(b)** resumable streams:

1. Add `active_streams` table (or Redis-only equivalent) tracking `chatId → streamId`.
2. Split `POST /api/chat` into POST (create) + GET (resume) halves using the `resumable-stream` package.
3. Switch the client to `useChat({ id, resume: true })`, drop the `stop()` button.
4. Buffer the UI message stream through Upstash so a reconnecting client picks up mid-run.

Then layer **(d)** Web Push on top of that:

5. Register a service worker, prompt for push permission after the first successful coach reply.
6. Push a "Your coach is ready" notification when a run finishes for a chat whose owner has no connected stream.

Only fall back to **(c)** background-job + polling if telemetry shows runs regularly exceeding Vercel function ceilings — at that point streaming-from-a-single-function is no longer viable and a worker is forced.

## Risks summary

| Option | Risks |
|---|---|
| (a) UX cue | Doesn't fix the bug; wake-lock unreliable on iOS; doesn't help if tab is closed. |
| (b) Resumable runs | Largest refactor; mutually exclusive with `stop()`; new schema + Redis topics; race when same chat id is open on two devices. |
| (c) Background job + polling | Loses token-by-token streaming UX; new queue dependency; local dev complexity; higher per-run cost. |
| (d) Web Push | iOS PWA-install gate; permission UX; VAPID key management; needs (b) or (c) underneath. |

## Suggested follow-up Linear tickets

To file once this note is approved (titles + scope, no implementation in this PR):

- **TGPT-?: Persist chat messages to Postgres (foundation for resume).** Schema + `onFinish` writer + load on `/coach` mount. Pre-req for any resume / push work.
- **TGPT-?: Wake-lock + "keep screen on" UX during coach streaming.** Smallest-v1 user-visible fix; can ship in parallel with persistence.
- **TGPT-?: Resumable chat streams via AI SDK `resume: true` + Upstash.** Full option (b). Removes client-side `stop()`. Depends on the persistence ticket.
- **TGPT-?: Web Push notifications for completed coach runs.** Option (d). Depends on persistence; SW registration is its own slice.
- **TGPT-?: Set explicit `maxDuration` on `/api/chat` + measure p95 run duration.** Sizing data so we know whether option (c) is ever needed.

## References

- AI SDK v6 — Chatbot Resume Streams: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-resume-streams
- AI SDK v6 — Transport: https://sdk.vercel.ai/docs/ai-sdk-ui/transport
- AI SDK v6 — Stopping Streams (resume / abort are mutually exclusive): https://sdk.vercel.ai/docs/advanced/stopping-streams
- Vercel — Configuring Maximum Duration for Functions: https://vercel.com/docs/functions/configuring-functions/duration
- MDN — Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- MDN — Push API / Web Push: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
