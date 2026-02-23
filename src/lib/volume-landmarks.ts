// Shared volume landmark data by experience level.
// Used by onboarding action and updateUserProfile AI tool.

type Landmark = { muscleGroup: string; mev: number; mav: number; mrv: number };

// Intermediate values = current seed.ts defaults (unchanged)
const intermediateLandmarks: Landmark[] = [
  { muscleGroup: "chest", mev: 8, mav: 14, mrv: 22 },
  { muscleGroup: "back", mev: 8, mav: 14, mrv: 22 },
  { muscleGroup: "quads", mev: 6, mav: 12, mrv: 20 },
  { muscleGroup: "hamstrings", mev: 4, mav: 10, mrv: 16 },
  { muscleGroup: "glutes", mev: 0, mav: 8, mrv: 16 },
  { muscleGroup: "front_delts", mev: 0, mav: 8, mrv: 14 },
  { muscleGroup: "side_delts", mev: 8, mav: 16, mrv: 26 },
  { muscleGroup: "rear_delts", mev: 6, mav: 12, mrv: 22 },
  { muscleGroup: "biceps", mev: 6, mav: 12, mrv: 20 },
  { muscleGroup: "triceps", mev: 4, mav: 10, mrv: 18 },
  { muscleGroup: "calves", mev: 6, mav: 12, mrv: 20 },
  { muscleGroup: "abs", mev: 0, mav: 8, mrv: 16 },
  { muscleGroup: "traps", mev: 0, mav: 8, mrv: 16 },
  { muscleGroup: "forearms", mev: 0, mav: 6, mrv: 12 },
];

function scale(landmarks: Landmark[], factor: number): Landmark[] {
  return landmarks.map((l) => ({
    muscleGroup: l.muscleGroup,
    mev: Math.round(l.mev * factor),
    mav: Math.round(l.mav * factor),
    mrv: Math.round(l.mrv * factor),
  }));
}

const landmarksByLevel: Record<string, Landmark[]> = {
  beginner: scale(intermediateLandmarks, 0.65),
  intermediate: intermediateLandmarks,
  advanced: scale(intermediateLandmarks, 1.3),
};

export function getVolumeLandmarksByLevel(level: string): Landmark[] {
  return landmarksByLevel[level] ?? intermediateLandmarks;
}
