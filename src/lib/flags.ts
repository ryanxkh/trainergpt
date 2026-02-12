import { flag } from "flags/next";

// Edge Config adapter — only used when EDGE_CONFIG is available.
// Falls back to defaultValue when not connected (local dev, builds).
const adapter = process.env.EDGE_CONFIG
  ? // Dynamic import avoided: edgeConfigAdapter is lightweight
    require("@flags-sdk/edge-config").edgeConfigAdapter()
  : undefined;

// ─── AI Model Selection ────────────────────────────────────────────
// Switch between Claude models without redeploying.
// Useful for cost control, A/B testing model quality, or fallback.

export const aiModel = flag<string>({
  key: "ai-model",
  adapter,
  description: "Claude model used for coaching chat",
  defaultValue: "claude-sonnet-4-5-20250929",
  decide() {
    return "claude-sonnet-4-5-20250929";
  },
  options: [
    { value: "claude-sonnet-4-5-20250929", label: "Sonnet 4.5 (Fast)" },
    { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (Budget)" },
  ],
});

// ─── Advanced Coaching Prompt ──────────────────────────────────────
// Toggles an enhanced system prompt with more detailed periodization
// advice, injury prevention cues, and nutrition references.

export const enableAdvancedCoaching = flag<boolean>({
  key: "enable-advanced-coaching",
  adapter,
  description: "Use enhanced AI system prompt with advanced periodization",
  defaultValue: false,
  decide() {
    return false;
  },
  options: [
    { value: true, label: "Enabled" },
    { value: false, label: "Disabled" },
  ],
});

// ─── Progress Charts ───────────────────────────────────────────────
// Gates the recharts-based volume and progression charts on the
// history page. Allows rolling out visualization features gradually.

export const showProgressCharts = flag<boolean>({
  key: "show-progress-charts",
  adapter,
  description: "Show volume and progression charts on history page",
  defaultValue: true,
  decide() {
    return true;
  },
  options: [
    { value: true, label: "Enabled" },
    { value: false, label: "Disabled" },
  ],
});

// ─── Workout Timer ─────────────────────────────────────────────────
// Toggles a rest period countdown timer in the workout logger.

export const enableWorkoutTimer = flag<boolean>({
  key: "enable-workout-timer",
  adapter,
  description: "Show rest timer countdown in workout logger",
  defaultValue: false,
  decide() {
    return false;
  },
  options: [
    { value: true, label: "Enabled" },
    { value: false, label: "Disabled" },
  ],
});
