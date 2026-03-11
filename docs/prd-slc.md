# TrainerGPT — SLC Product Requirements Document

> **Status**: Draft
> **Author**: Ryan Hodge
> **Date**: 2026-02-22
> **Version**: 1.0

---

## 1. Product Vision

**One-liner**: TrainerGPT is an AI coach that designs and manages hypertrophy training programs through conversation, prescribing workouts, tracking volume landmarks, and adjusting progressions based on real performance data — not generic templates.

**Target user**: Gym-goers focused on hypertrophy — weighted toward intermediate lifters who understand training to failure and RIR, but accessible to motivated beginners. The product educates where needed (explains RIR, MEV/MRV in context) rather than gatekeeping on prerequisite knowledge.

**Value proposition**: The fitness app market splits into two buckets: unintelligent loggers (Strong, JFit) and generic AI chats (people asking ChatGPT for a program). TrainerGPT's value lives in the gap — an AI that both knows the science **and** has your data. The aha moment: the coach makes a decision about your training you didn't ask for, using data you logged. Not "here's a workout" (every app does that), but "your quad volume is approaching MRV — let's back off on leg extensions" or "you've stalled on bench for three sessions, here's what I'd change."

**Product model**: Single-player. User + AI coach. No trainer-client model, no community, no social features for SLC.

---

## 2. Core User Flows

### 2.1 Authentication

**Current**: GitHub OAuth only.
**SLC**: Three auth providers:
- Google OAuth (primary — gym-goers don't have GitHub accounts)
- Email + password (standard signup/login)
- GitHub OAuth (keep for dev audience)

**Implementation**: NextAuth v5 supports multiple providers. Add `GoogleProvider` and `CredentialsProvider` to the auth config. Update the login page to show all three options.

### 2.2 Onboarding (New — Build)

**Current**: None. Users land in an empty chat.
**SLC**: A 4-step setup wizard that runs once after first sign-in.

**Step 1 — Experience Level**
- Beginner / Intermediate / Advanced
- Brief description under each: "I'm new to structured training" / "I've been lifting 1-2 years and understand progressive overload" / "I've run multiple mesocycles and track volume landmarks"
- Persists to `users.experienceLevel`

**Step 2 — Training Availability**
- "How many days per week can you train?" — selector: 2, 3, 4, 5, 6
- Persists to `users.availableTrainingDays`

**Step 3 — Preferred Split**
- All split options available regardless of training days: Full Body, Upper/Lower, Push/Pull/Legs, Custom
- No hardcoded recommendations — the coach makes split suggestions agentically based on the user's full profile (experience, days, goals, equipment) after onboarding completes
- This step captures user preference, not a prescription. The coach may suggest a different split in the first conversation if the data supports it.
- Persists to `users.preferredSplit`

**Step 4 — Equipment Access**
- Gym type selector (determines exercise filtering):
  - **Home / Minimal** — Dumbbells, bands, pull-up bar, kettlebells, yoga mat
  - **Apartment Gym** — Basic machines (cable stack, leg press, smith machine), dumbbells, benches
  - **Commercial Gym** — Full machine selection, barbells, dumbbells, cables, standard equipment (Crunch, Gold's, LA Fitness)
  - **Specialty / Bodybuilding Gym** — Everything above plus specialized equipment: Prime, Atlantis, Mega Mass, Panata machines, hack squats, chest-supported rows, cambered bars, belt squats
- Persists to a new `users.equipmentAccess` column (enum: `home`, `apartment`, `commercial`, `specialty`)

**Post-wizard**:
- Seed default volume landmarks based on experience level (beginner gets conservative MEV/MAV/MRV, advanced gets higher ceilings)
- Redirect to `/coach` with a system-generated first message: "Welcome! I've set you up as an [intermediate] lifter training [4 days/week] on an [upper/lower split] at a [commercial gym]. Let's design your first mesocycle. What are your current training goals?"

**Schema changes**:
- Add `equipmentAccess` enum column to `users` table
- Add `onboardingComplete` boolean column to `users` table (default `false`)
- Add `updateUserProfile` AI tool so coach can persist profile changes from conversation

### 2.3 Core Training Loop

The product's core loop: **Prescribe → Log → Analyze → Prescribe Better**.

#### Prescribe Workout
- **Existing**: `prescribeWorkout` tool creates session with exercises, validates against MRV. Works.
- **SLC change**: Before calling `prescribeWorkout`, if there is an active session (stale or in-progress), the coach must surface it: *"You have an open session from Tuesday with 4 sets logged. Want to finish it or close it out?"* Add this as a system prompt instruction.

#### Start / Log Workout
- **Existing**: Active workout page with exercise cards, set logging, weight carry-forward, set types (normal/myorep/drop), rest timer. Works well.
- **SLC**: No changes needed. This is the most polished surface.

#### Complete Workout
- **Existing**: UI completion button sets `durationMinutes` and `postNotes`. Works.
- **SLC change**: Add `completeWorkoutSession` AI tool (see section 4.1).
- **SLC change**: Add `status` enum column to `workoutSessions`: `active` / `completed` / `abandoned`. Replace the `durationMinutes IS NULL` check everywhere.

#### Review History
- **Existing**: Session history list + feature-flagged charts (volume over time, exercise progression).
- **SLC**: Turn on all feature flags. Remove gating. Charts ship to everyone.

#### Adapt Next Session
- **Existing**: Coach uses `getWorkoutHistory` + `getProgressionTrend` + `getVolumeThisWeek` to adjust. Works.
- **SLC**: No tool changes. Fix the volume data integrity bug (section 4.3) so adaptation is based on accurate numbers.

### 2.4 Mesocycle View (New — Build)

**Current**: `/program` redirects to `/coach`. `/program/[mesoId]` is a skeleton showing name, week, status, split, start date.

**SLC**: A real mesocycle view at `/program` (add to navigation).

**Contents**:
- Active mesocycle header: name, split type, current week / total weeks, start date
- Week-by-week timeline: visual indicator of current position, completed weeks (green), upcoming weeks (muted), deload week (distinct styling)
- Per-week summary: planned sessions, completed sessions, total volume per muscle group, volume vs landmark status (under/at/above MEV/MAV/MRV)
- Current week expanded: shows this week's workouts (completed and upcoming) with quick-tap to navigate to workout detail or active workout
- Deload week: visually distinct (different color/icon), shows reduced volume targets

**Data source**: `mesocycles` table already has `totalWeeks`, `currentWeek`, `volumePlan` (JSONB week-by-week volume targets), `status`. `workoutSessions` link to mesocycles via `mesocycleId` and `mesocycleWeek`.

### 2.5 Workout Scheduling (New — Build)

**Current**: Always "what should I train today?" — no visibility of upcoming workouts.

**SLC**: Show the current week's workouts on the mesocycle view and on a refreshed `/workout` landing page.

**Behavior**:
- When the coach prescribes a mesocycle, it should plan the full week's sessions (e.g., Mon: Push, Wed: Pull, Fri: Legs, Sat: Upper)
- `/workout` shows: active session (if one exists) at top, then upcoming sessions for the rest of the week
- Users can tap an upcoming session to start it (which sets it to active)
- Workouts are week-scoped, not month-scoped — the coach re-prescribes each week based on last week's data, maintaining adaptability

**Why week-scoped**: The coach needs freedom to swap exercises, adjust volume, and respond to user feedback (joint pain, stalls, fatigue). Showing 4-6 weeks of locked-in sessions contradicts the adaptive model. The mesocycle view shows the volume plan and structure; the workout view shows the concrete sessions for this week only.

### 2.6 Deload Sessions

**Current**: Coach recommends deloads, deload detection cron exists, but no UI distinction.

**SLC**: Deload sessions should be visually distinct:
- Deload badge on the session card (in workout view, history, and mesocycle view)
- Lighter/muted styling on exercise cards (reduced intensity feel)
- Brief educational note at the top: "Deload week — reduced volume to let your body recover. Same exercises, fewer sets, lighter weight."
- Data: Add `isDeload` boolean to `workoutSessions` table (set by `prescribeWorkout` tool when deload flag is passed)

### 2.7 Settings Page (New — Build)

**Current**: Does not exist.

**SLC**: `/settings` page with sections:

**Profile**
- Name, email (read-only from auth)
- Experience level (editable)
- Training age in months (editable)

**Training Preferences**
- Available training days (editable)
- Preferred split (editable)
- Equipment access / gym type (editable)

**Volume Landmarks**
- Per-muscle-group table: MEV / MAV / MRV (editable, with current values and "reset to defaults" option)
- Coach-managed by default, but users can override

**Account**
- Sign out
- (Future: delete account, export data — out of scope for SLC)

**Data flow**: Settings page reads from `users` table and `userVolumeLandmarks`. Edits go through server actions that update the DB and invalidate the profile cache.

### 2.8 Exercise Library Enhancements

**Current**: Browse-only. Filterable by muscle group. Individual exercise detail pages.

**SLC additions**:
- **Custom exercises**: Users can add exercises with: name, primary/secondary muscle groups, equipment, movement pattern. Stored in `exercises` table with a `userId` column (null = seeded/global, non-null = user-created). Coach's `getExerciseLibrary` tool returns both global and user-created exercises.
- **Per-exercise history**: On the exercise detail page, show the user's logged sets for that exercise across sessions (weight/reps/RIR over time chart). Data already exists in `exerciseSets`.
- **Favorites**: Not required for SLC. Defer.

**Schema change**: Add nullable `userId` column to `exercises` table. Add unique constraint on `(name, userId)` where `userId IS NULL` for global exercises.

---

## 3. Feature Inventory

### Keep (Already Polished)
| Feature | Location | Notes |
|---------|----------|-------|
| Coach chat | `/coach` | 7 tools, streaming, 94% eval score |
| Workout logging | `/workout` | Exercise cards, set types, weight carry-forward, rest timer |
| Exercise info sheet | Workout page | Muscle groups, SFR, movement pattern, rest |
| Exercise swap/replace | Workout page | Alternative exercise suggestions |
| History | `/history` | Session list, workout detail |
| Exercise library | `/exercises` | Browse, filter, detail pages |
| Dark mode + Geist styling | Global | Theme toggle, OKLCH → Geist tokens |
| Mobile bottom nav | Global | 4 tabs, active route |
| OG image sharing | History | Share workout screenshots |
| Deload detection | Cron | Auto-recommends deloads |

### Build (New for SLC)
| Feature | Priority | Complexity | Section |
|---------|----------|------------|---------|
| Onboarding wizard (4 steps) | P0 | Medium | 2.2 |
| Google OAuth + email/password auth | P0 | Medium | 2.1 |
| `completeWorkoutSession` AI tool | P0 | Low | 4.1 |
| Session status enum (`active`/`completed`/`abandoned`) | P0 | Medium | 4.1 |
| Volume cache fix (hard sets only) | P0 | Low | 4.3 |
| Settings page | P1 | Medium | 2.7 |
| Mesocycle view (`/program`) | P1 | Medium-High | 2.4 |
| Weekly workout scheduling | P1 | Medium | 2.5 |
| `updateUserProfile` AI tool | P1 | Low | 2.2 |
| Custom exercises | P1 | Low-Medium | 2.8 |
| Per-exercise history on detail page | P1 | Low | 2.8 |
| Deload session styling | P2 | Low | 2.6 |
| Error state UX (API failures, stuck sessions) | P2 | Medium | 4.4 |
| Remove all feature flags (ship everything) | P2 | Low | — |

### Cut / Defer (Explicitly Out of Scope)
| Feature | Reason |
|---------|--------|
| Nutrition tracking | Different domain — doesn't make the coach smarter about hypertrophy |
| Cardio programming | Different training modality |
| Native mobile app | PWA/responsive web is sufficient for SLC |
| Multi-user / social (leaderboards, shared workouts) | Scope creep — nail single-player first |
| Coach personality customization | Cosmetic, doesn't improve coaching quality |
| Payments / subscription | Infrastructure, not a feature — add when there's something to charge for |
| Exercise video/demo library | Content problem, not engineering — media pipeline, not code |
| Trainer-client model | Interesting future direction but out of scope |
| Push notifications | Retention mechanic, not core value |
| Data export | Nice-to-have, not SLC |
| Account deletion | Compliance concern but not SLC-blocking |
| Exercise favorites | Low impact, defer |

---

## 4. Technical Work

### 4.1 Session Lifecycle Fix

**Problem**: `workoutSessions` has no `status` column. "Active" is inferred from `durationMinutes IS NULL`, which conflates "in progress" with "abandoned." Stale sessions cause the coach to log sets against the wrong workout or fail to prescribe new ones.

**Solution**:

1. **Add `status` enum to `workoutSessions`**: `active` | `completed` | `abandoned` (default: `active`)
2. **Migrate existing data**: Sessions with `durationMinutes IS NOT NULL` → `completed`. Sessions with `durationMinutes IS NULL` older than 48 hours → `abandoned`. Remaining → `active`.
3. **Update all queries** that check `durationMinutes IS NULL` to use `status = 'active'` instead:
   - `logWorkoutSet` tool (finds active session)
   - `getActiveSession()` server action
   - `completeWorkout()` server action
   - `getActiveMesocycleContext()` if applicable
4. **Add `completeWorkoutSession` AI tool**:
   ```
   completeWorkoutSession
   ├── sessionId (optional — defaults to current active session)
   ├── abandoned: boolean (sets status to 'abandoned' vs 'completed')
   └── returns: session summary + "ready for new workout" confirmation
   ```
5. **System prompt addition**: "Before calling `prescribeWorkout`, check if there's already an active session. If yes, surface it to the user and ask if they want to finish or close it. Do not silently create a second active session."
6. **Stale session cleanup**: Add a check in `prescribeWorkout` — if an active session exists older than 48h, auto-mark it `abandoned` and log a note rather than blocking prescription. (48h threshold accounts for late-night sessions completed the next day.)

### 4.2 `updateUserProfile` AI Tool

**Problem**: The coach asks new users about experience, goals, and preferences during onboarding conversation but has no tool to persist these answers back to the `users` table.

**Solution**: New tool `updateUserProfile` that accepts partial profile updates:
```
updateUserProfile
├── experienceLevel? (beginner/intermediate/advanced)
├── trainingAgeMonths? (number)
├── availableTrainingDays? (number)
├── preferredSplit? (full_body/upper_lower/push_pull_legs/custom)
├── equipmentAccess? (home/apartment/commercial/specialty)
└── returns: updated profile confirmation
```
Invalidates profile cache on write.

### 4.3 Volume Cache Fix

**Problem**: `getCachedVolume()` counts all logged sets regardless of RIR. Hard sets (RIR 0-4) are the only ones that count toward volume landmarks per the training philosophy. This inflates volume numbers, causing the MRV guardrail to fire prematurely and the coach to under-prescribe.

**Solution**:
1. Add `WHERE exercise_sets.rir <= 4` to the volume aggregation query in `cache.ts`
2. Also filter to `workoutSessions.status = 'completed'` (after session lifecycle fix) — only completed sessions contribute volume. Active (in-progress) sessions must not inflate weekly totals until the user finishes the workout. Abandoned sessions never count.
3. Apply the same filter in the weekly summary cron (`/api/cron/weekly-summary`)
4. Add an integration test: seed a known training week with a mix of RIR values and session statuses (completed, active, abandoned), assert `getVolumeThisWeek` returns exact expected hard-set counts from completed sessions only

### 4.4 Error State UX

**Problem**: Minimal error handling UX. API failures, stuck sessions, and bad data surface as silent failures or broken states.

**SLC minimum**:
- **Chat errors**: If `streamText` fails, show a retry-able error message in the chat UI (not a blank response)
- **Workout logging errors**: If `logWorkoutSet` fails, show an inline error on the set row with retry
- **Stale session detection**: If user navigates to `/workout` and the active session is >48h old, show a banner: "You have an unfinished session from [date]. Complete it or start fresh?"
- **Network offline**: Basic offline detection — disable send button, show "No connection" indicator

### 4.5 Schema Changes Summary

New columns:
| Table | Column | Type | Default |
|-------|--------|------|---------|
| `users` | `equipmentAccess` | enum (`home`/`apartment`/`commercial`/`specialty`) | `commercial` |
| `users` | `onboardingComplete` | boolean | `false` |
| `workoutSessions` | `status` | enum (`active`/`completed`/`abandoned`) | `active` |
| `workoutSessions` | `isDeload` | boolean | `false` |
| `exercises` | `userId` | integer (FK, nullable) | `null` |

New unique constraint:
- `exercises(name)` WHERE `userId IS NULL` (partial unique index on global exercises)

New AI tools:
- `completeWorkoutSession` — close/abandon a session
- `updateUserProfile` — persist profile changes from conversation

---

## 5. Acceptance Criteria

### 5.1 The Coaching Loop Closes

The product's value lives in one loop: prescribe → log → analyze → prescribe better. The metric is **loop completion rate** — the percentage of users who receive a prescribed workout, log at least one full session, and return for a second prescription that references the first.

**Target**: 40%+ of users who receive a first prescription complete the loop to a second personalized prescription within 14 days.

### 5.2 AI Coaching Quality

**Layer 1 — Policy compliance (automated, runs on every prompt change)**:
- Current: 16/17 scenarios, 98% assertion rate. This is the floor. It catches regressions. This stays green or we don't ship.

**Layer 2 — Coaching quality (expert-validated golden scenarios)**:
- Build a set of 25+ "golden" scenarios with expert-validated correct answers: progression stalls where the right call is a deload, imbalanced volume distributions, fatigue markers requiring intervention.
- **Target**: ≥90% agreement with expert-validated decisions.

### 5.3 Data Integrity Is Provably Correct

- Weekly volume per muscle group matches a manual count of hard sets (RIR 0-4) from completed sessions only
- No session older than 24 hours sits in ambiguous "active" state
- Integration test seeds a known training week and asserts the coach's volume tool returns exact expected values
- **Target**: Zero discrepancy between tool output and ground truth on a seeded test dataset

### 5.4 Time-to-Value Under 5 Minutes

A new user goes from sign-up to receiving a workout prescription tailored to their profile in under 5 minutes and no more than 3 conversational turns. Profile collection happens during onboarding (not deferred to chat). Volume landmarks seeded from experience-level defaults. First prescribed workout reflects stated training days, split preference, and equipment access.

### 5.5 Week-over-Week Retention

**Target**: 30%+ of users who complete their first workout return to log a workout in week 3. For context, most fitness apps see sub-20% week-3 retention. Beating that with an AI coach — without push notifications, social pressure, or gamification — signals the personalization loop is working.

### 5.6 Full Mesocycle Without Dead Ends

A user can train with TrainerGPT for a full mesocycle (4-6 weeks), and at the end, the coach's prescription quality — measured by volume management, progression decisions, and exercise selection — is meaningfully better in week 6 than week 1 because it learned from the user's data.

### 5.7 Stranger Test

A stranger can sign up and use the app independently for a week without confusion. Every workflow has a beginning, middle, and end. No dead-end routes. No unexplained empty states.

### 5.8 Portfolio-Ready

Clean, demo-able, shareable publicly for real user feedback. Tells a coherent story about Vercel platform fluency (Next.js App Router, AI SDK, Edge Config, Neon, Upstash, feature flags, streaming UI).

---

## 6. Non-Goals (Explicit Scope Boundaries)

**The litmus test**: Does this feature make the coach smarter about your hypertrophy training, or does it make the app do more things? The first is in scope. The second is scope creep.

| Non-goal | Rationale |
|----------|-----------|
| Nutrition tracking | Different domain entirely |
| Cardio programming | Different training modality |
| Native mobile app | Responsive web is the product |
| Social features (leaderboards, shared workouts) | Doesn't make coaching better |
| Coach personality customization | Cosmetic |
| Payments / subscription | Infrastructure — add when there's something to charge for. Simple Stripe integration won't require architecture changes. |
| Exercise video/demo library | Content pipeline, not a code feature |
| Trainer-client model | Interesting future direction, but nail single-player first |
| Push notifications | Retention mechanic, not core coaching value |

---

## 7. Implementation Sequence

Ordered by dependency and impact:

**Phase 1 — Data Foundation + Auth** (unblocks everything else)
1. Google OAuth + email/password auth providers
2. Session status enum migration + query updates
3. Volume cache fix (hard sets only, completed sessions only)
4. `completeWorkoutSession` AI tool
5. Integration tests for volume accuracy

**Phase 2 — Onboarding** (unblocks real users)
6. `equipmentAccess` + `onboardingComplete` schema migration
7. Onboarding wizard (4 steps)
8. Default volume landmark seeding by experience level
9. `updateUserProfile` AI tool

**Phase 3 — Mesocycle & Scheduling** (completes the training loop)
10. Mesocycle view (`/program`) with week-by-week timeline
11. Weekly workout scheduling (upcoming sessions on `/workout`)
12. Deload session styling

**Phase 4 — Polish & Completeness**
13. Settings page
14. Custom exercises (schema + UI + tool update)
15. Per-exercise history on detail pages
16. Error state UX
17. Remove all feature flags
18. Update navigation (add Program tab)

---

*This document is the source of truth for TrainerGPT SLC scope. Features not listed here are out of scope. If a decision needs to be revisited, update this document — not a Slack thread.*
