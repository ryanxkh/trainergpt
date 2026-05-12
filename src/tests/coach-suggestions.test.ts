import { describe, it, expect } from "vitest";
import { generateSuggestionCards } from "@/lib/coach-suggestions";
import type { SessionBriefing } from "@/lib/briefing";

function makeBriefing(overrides: Partial<SessionBriefing> = {}): SessionBriefing {
  return {
    mesocycleStatus: "Week 2 of 5 — Hypertrophy (push/pull/legs)",
    daysSinceLastWorkout: 1,
    lastSessionName: "Push Day A",
    volumeStatuses: [],
    muscleGroupsNeedingWork: [],
    progressionFlags: [],
    deloadStatus: "Not recommended (week 2 of 5, no systemic performance decline)",
    recommendation: null,
    ...overrides,
  };
}

describe("generateSuggestionCards", () => {
  it("returns 3 generic cards when briefing is null (new user)", () => {
    const cards = generateSuggestionCards(null);
    expect(cards).toHaveLength(3);
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("plan-today");
    expect(ids).toContain("volume");
    expect(ids).toContain("new-program");
  });

  it("returns between 3 and 5 cards for any non-null briefing", () => {
    const briefings: SessionBriefing[] = [
      makeBriefing(),
      makeBriefing({
        muscleGroupsNeedingWork: ["chest", "back", "quads", "hamstrings"],
        progressionFlags: [
          { exercise: "Bench Press", flag: "ready_to_increase", detail: "185lb x 10 @ 1 RIR for 3 sessions — bump to 190lb" },
          { exercise: "Squat", flag: "overreach", detail: "reps declining 8 -> 7 -> 6 at 225lb" },
        ],
        deloadStatus: "RECOMMENDED — scheduled deload (week 5 of 5)",
      }),
    ];
    for (const briefing of briefings) {
      const cards = generateSuggestionCards(briefing);
      expect(cards.length).toBeGreaterThanOrEqual(3);
      expect(cards.length).toBeLessThanOrEqual(5);
    }
  });

  it("puts the deload card first when deload is recommended", () => {
    const cards = generateSuggestionCards(
      makeBriefing({
        deloadStatus: "RECOMMENDED — scheduled deload (week 5 of 5)",
        muscleGroupsNeedingWork: ["chest"],
      })
    );
    expect(cards[0].id).toBe("deload");
    expect(cards[0].badge).toBe("Deload due");
    expect(cards[0].prompt.toLowerCase()).toContain("deload");
  });

  it("emits below-MEV cards for up to two groups with prompts that name the group", () => {
    const cards = generateSuggestionCards(
      makeBriefing({
        muscleGroupsNeedingWork: ["chest", "back", "quads"],
      })
    );
    const mevCards = cards.filter((c) => c.badge === "Below MEV");
    expect(mevCards).toHaveLength(2);
    expect(mevCards.map((c) => c.id)).toEqual([
      "below-mev-chest",
      "below-mev-back",
    ]);
    expect(mevCards[0].title).toContain("Chest");
    expect(mevCards[0].prompt.toLowerCase()).toContain("chest");
  });

  it("emits a ready-to-progress card when a progression flag is present", () => {
    const cards = generateSuggestionCards(
      makeBriefing({
        progressionFlags: [
          {
            exercise: "Bench Press",
            flag: "ready_to_increase",
            detail: "185lb x 10 @ 1 RIR for 3 sessions — ready for weight increase",
          },
        ],
      })
    );
    const progress = cards.find((c) => c.id === "progress-Bench Press");
    expect(progress).toBeDefined();
    expect(progress?.badge).toBe("Ready to progress");
    expect(progress?.prompt).toContain("Bench Press");
  });

  it("adds a split-complement card based on the last session name", () => {
    const upperCards = generateSuggestionCards(
      makeBriefing({ lastSessionName: "Upper Day B" })
    );
    expect(upperCards.some((c) => c.id === "complement-lower")).toBe(true);

    const pushCards = generateSuggestionCards(
      makeBriefing({ lastSessionName: "Push Day A" })
    );
    expect(pushCards.some((c) => c.id === "complement-pull-or-legs")).toBe(true);
  });

  it("fills with generic fallbacks when state-driven cards are sparse", () => {
    const cards = generateSuggestionCards(
      makeBriefing({ lastSessionName: "Mystery Session" })
    );
    expect(cards.length).toBeGreaterThanOrEqual(3);
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("plan-today");
  });

  it("caps the result at 5 cards even when many signals are present", () => {
    const cards = generateSuggestionCards(
      makeBriefing({
        deloadStatus: "RECOMMENDED — scheduled deload (week 5 of 5)",
        muscleGroupsNeedingWork: ["chest", "back", "quads", "hamstrings"],
        progressionFlags: [
          { exercise: "Bench", flag: "ready_to_increase", detail: "ready" },
          { exercise: "Squat", flag: "overreach", detail: "fatigue" },
        ],
        lastSessionName: "Upper Day",
      })
    );
    expect(cards).toHaveLength(5);
  });
});
