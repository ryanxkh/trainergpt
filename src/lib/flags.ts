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

// ─── Removed Feature Flags ────────────────────────────────────────
// The following flags have been shipped to all users:
// - enable-advanced-coaching (always on)
// - show-progress-charts (always on)
// - enable-workout-timer (always on)
