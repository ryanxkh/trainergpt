import type { SessionBriefing } from "./briefing";

// Suggestion cards rendered on the coach screen empty state. Tapping a card
// fires the prompt as the first user message — this preserves the
// "coach already knows my state" feel without auto-firing /api/chat on mount.

export type SuggestionCard = {
  id: string;
  title: string;
  prompt: string;
  badge?: string;
};

const MAX_CARDS = 5;
const MIN_CARDS = 3;

const GENERIC_FALLBACK: SuggestionCard[] = [
  {
    id: "plan-today",
    title: "What should I train today?",
    prompt: "What should I train today?",
  },
  {
    id: "volume",
    title: "How's my volume looking this week?",
    prompt: "How's my volume looking this week?",
  },
  {
    id: "new-program",
    title: "Create a new program for me",
    prompt: "Create a new program for me.",
  },
];

export function generateSuggestionCards(
  briefing: SessionBriefing | null
): SuggestionCard[] {
  if (!briefing) return GENERIC_FALLBACK.slice(0, MIN_CARDS);

  const cards: SuggestionCard[] = [];
  const seen = new Set<string>();
  const add = (card: SuggestionCard) => {
    if (cards.length >= MAX_CARDS) return;
    if (seen.has(card.id)) return;
    seen.add(card.id);
    cards.push(card);
  };

  // 1. Deload — top priority when recommended
  if (briefing.deloadStatus.startsWith("RECOMMENDED")) {
    add({
      id: "deload",
      title: "Plan my deload session",
      prompt:
        "A deload looks due. Plan a reduced-volume session for me at 50–60% of normal volume.",
      badge: "Deload due",
    });
  }

  // 2. Muscle groups below MEV — up to two
  for (const group of briefing.muscleGroupsNeedingWork.slice(0, 2)) {
    const pretty = formatMuscleGroup(group);
    add({
      id: `below-mev-${group}`,
      title: `${pretty} is below MEV — plan a session`,
      prompt: `${pretty} is below MEV this week. Prescribe a workout that prioritizes ${pretty.toLowerCase()}.`,
      badge: "Below MEV",
    });
  }

  // 3. Ready-to-progress exercise — one card
  const readyToIncrease = briefing.progressionFlags.find(
    (f) => f.flag === "ready_to_increase"
  );
  if (readyToIncrease) {
    add({
      id: `progress-${readyToIncrease.exercise}`,
      title: `Bump weight on ${readyToIncrease.exercise}`,
      prompt: `I'm ready to push ${readyToIncrease.exercise} today. ${readyToIncrease.detail}. What's the call?`,
      badge: "Ready to progress",
    });
  }

  // 4. Overreach signal — one card
  const overreach = briefing.progressionFlags.find((f) => f.flag === "overreach");
  if (overreach) {
    add({
      id: `overreach-${overreach.exercise}`,
      title: `Manage fatigue on ${overreach.exercise}`,
      prompt: `${overreach.exercise} looks like it's overreaching: ${overreach.detail}. How should I adjust today?`,
      badge: "Overreach",
    });
  }

  // 5. Split complement based on last session
  const complement = computeSplitComplement(briefing);
  if (complement) add(complement);

  // 6. Generic fallbacks until we hit MIN_CARDS
  for (const fallback of GENERIC_FALLBACK) {
    if (cards.length >= MIN_CARDS) break;
    add(fallback);
  }

  return cards;
}

function computeSplitComplement(
  briefing: SessionBriefing
): SuggestionCard | null {
  const last = briefing.lastSessionName?.toLowerCase() ?? "";
  if (!last) return null;

  if (last.includes("upper")) {
    return {
      id: "complement-lower",
      title: "Plan a lower session to complement my last upper day",
      prompt:
        "My last session was upper body. Prescribe a lower session to complement it.",
    };
  }
  if (last.includes("lower")) {
    return {
      id: "complement-upper",
      title: "Plan an upper session to complement my last lower day",
      prompt:
        "My last session was lower body. Prescribe an upper session to complement it.",
    };
  }
  if (last.includes("push")) {
    return {
      id: "complement-pull-or-legs",
      title: "Plan a pull or legs day to keep the rotation going",
      prompt:
        "My last session was push. Prescribe a pull or legs session to keep the rotation going.",
    };
  }
  if (last.includes("pull")) {
    return {
      id: "complement-legs-or-push",
      title: "Plan a legs or push day to keep the rotation going",
      prompt:
        "My last session was pull. Prescribe a legs or push session to keep the rotation going.",
    };
  }
  if (last.includes("leg")) {
    return {
      id: "complement-push-or-pull",
      title: "Plan a push or pull day to keep the rotation going",
      prompt:
        "My last session was legs. Prescribe a push or pull session to keep the rotation going.",
    };
  }
  return null;
}

function formatMuscleGroup(group: string): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}
