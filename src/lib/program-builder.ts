// ─── Program Builder ──────────────────────────────────────────────────
// Takes a ProgramTemplate + user profile → builds a personalized
// SessionPlan with real exercises and volume from landmarks.

import type { SessionPlan, SessionPlanExercise } from "@/lib/program-utils";
import type { ProgramTemplate, ExerciseSlot } from "@/lib/program-templates";
import { EQUIPMENT_BY_ACCESS, EQUIPMENT_PREFERENCE } from "@/lib/program-templates";

// ─── Types ───────────────────────────────────────────────────────────

type Exercise = {
  id: number;
  name: string;
  muscleGroups: { primary: string[]; secondary: string[] };
  movementPattern: string;
  equipment: string;
  sfrRating: string | null;
  isStretchFocused: boolean | null;
  repRangeOptimal: [number, number] | null;
  defaultRestSeconds: number | null;
};

type VolumeLandmark = {
  muscleGroup: string;
  mev: number;
  mav: number;
  mrv: number;
};

type BuilderInput = {
  template: ProgramTemplate;
  exercises: Exercise[];
  landmarks: VolumeLandmark[];
  equipmentAccess: string;
};

export type BuilderPreview = {
  templateSlug: string;
  templateName: string;
  splitType: string;
  totalWeeks: number;
  sessions: {
    name: string;
    dayNumber: number;
    exercises: {
      exerciseId: number;
      exerciseName: string;
      targetMuscle: string;
      equipment: string;
      sets: number;
      repRangeMin: number;
      repRangeMax: number;
      restSeconds: number;
    }[];
  }[];
  weeklyVolume: Record<string, { planned: number; mev: number; mav: number; mrv: number }>;
};

// ─── Exercise Selection ──────────────────────────────────────────────

function selectExercise(
  slot: ExerciseSlot,
  exercises: Exercise[],
  availableEquipment: string[],
  usedExerciseIds: Set<number>,
): Exercise | null {
  // Filter: must match primary muscle + movement pattern + available equipment
  let candidates = exercises.filter((e) => {
    const primaryMatch = e.muscleGroups.primary.includes(slot.targetMuscle);
    const patternMatch =
      slot.movementPattern === "isolation"
        ? e.movementPattern === "isolation"
        : e.movementPattern === slot.movementPattern;
    const equipmentMatch = availableEquipment.includes(e.equipment);
    return primaryMatch && patternMatch && equipmentMatch;
  });

  // Prefer unused exercises to avoid duplicates within a program
  const unused = candidates.filter((e) => !usedExerciseIds.has(e.id));
  if (unused.length > 0) candidates = unused;

  if (candidates.length === 0) {
    // Fallback: relax movement pattern — just match muscle + equipment
    candidates = exercises.filter((e) => {
      const primaryMatch = e.muscleGroups.primary.includes(slot.targetMuscle);
      const equipmentMatch = availableEquipment.includes(e.equipment);
      return primaryMatch && equipmentMatch;
    });
    const unusedFallback = candidates.filter((e) => !usedExerciseIds.has(e.id));
    if (unusedFallback.length > 0) candidates = unusedFallback;
  }

  if (candidates.length === 0) return null;

  // Score and sort candidates
  candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Equipment preference (machine/cable first)
    const eqIdxA = EQUIPMENT_PREFERENCE.indexOf(a.equipment);
    const eqIdxB = EQUIPMENT_PREFERENCE.indexOf(b.equipment);
    scoreA -= eqIdxA >= 0 ? eqIdxA : 99;
    scoreB -= eqIdxB >= 0 ? eqIdxB : 99;

    // Stretch-focused preference
    if (slot.preferStretchFocused) {
      if (a.isStretchFocused) scoreA += 5;
      if (b.isStretchFocused) scoreB += 5;
    }

    // High SFR preference (for isolations)
    if (slot.preferHighSfr) {
      if (a.sfrRating === "high") scoreA += 3;
      if (b.sfrRating === "high") scoreB += 3;
    }

    // For compounds, prefer lower SFR (more stimulus per set)
    if (slot.role === "compound") {
      if (a.sfrRating === "low") scoreA += 2;
      if (b.sfrRating === "low") scoreB += 2;
      if (a.sfrRating === "medium") scoreA += 1;
      if (b.sfrRating === "medium") scoreB += 1;
    }

    return scoreB - scoreA;
  });

  return candidates[0];
}

// ─── Volume Distribution ─────────────────────────────────────────────

function calculateVolume(
  template: ProgramTemplate,
  landmarks: VolumeLandmark[],
): Record<string, number> {
  // Target MAV for each muscle group
  const landmarkMap = new Map(landmarks.map((l) => [l.muscleGroup, l]));

  // Count how many slots target each muscle across all sessions
  const muscleSlotCounts: Record<string, number> = {};
  for (const session of template.sessions) {
    for (const slot of session.slots) {
      muscleSlotCounts[slot.targetMuscle] =
        (muscleSlotCounts[slot.targetMuscle] || 0) + 1;
    }
  }

  // Calculate sets per slot: target weekly volume / slots for that muscle
  const setsPerSlot: Record<string, number> = {};
  for (const [muscle, slotCount] of Object.entries(muscleSlotCounts)) {
    const landmark = landmarkMap.get(muscle);
    if (!landmark) {
      // Default: 3 sets per slot if no landmark exists
      setsPerSlot[muscle] = 3;
      continue;
    }

    // Target the midpoint between MEV and MAV (lean toward MAV)
    const targetWeekly = Math.round(landmark.mev + (landmark.mav - landmark.mev) * 0.7);
    const perSlot = Math.round(targetWeekly / slotCount);

    // Clamp: minimum 2 sets, maximum 5 sets per exercise
    setsPerSlot[muscle] = Math.max(2, Math.min(5, perSlot));
  }

  return setsPerSlot;
}

// ─── RIR Progression ─────────────────────────────────────────────────

function getRirForWeek(week: number, totalWeeks: number): number {
  // Week 1: RIR 3, Week 2: RIR 2, Week 3: RIR 1, Week 4: RIR 0
  const progression = [3, 2, 1, 0];
  const idx = Math.min(week - 1, progression.length - 1);
  return progression[idx];
}

// ─── Main Builder ────────────────────────────────────────────────────

export function buildProgramPreview(input: BuilderInput): BuilderPreview {
  const { template, exercises, landmarks, equipmentAccess } = input;

  const availableEquipment =
    EQUIPMENT_BY_ACCESS[equipmentAccess] ?? EQUIPMENT_BY_ACCESS.commercial;

  const setsPerSlot = calculateVolume(template, landmarks);
  const usedExerciseIds = new Set<number>();

  const sessions = template.sessions.map((session) => {
    const selectedExercises = session.slots
      .map((slot) => {
        const exercise = selectExercise(
          slot,
          exercises,
          availableEquipment,
          usedExerciseIds,
        );
        if (!exercise) return null;

        usedExerciseIds.add(exercise.id);

        return {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetMuscle: slot.targetMuscle,
          equipment: exercise.equipment,
          sets: setsPerSlot[slot.targetMuscle] ?? 3,
          repRangeMin: slot.repRange[0],
          repRangeMax: slot.repRange[1],
          restSeconds: slot.restSeconds,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return {
      name: session.name,
      dayNumber: session.dayNumber,
      exercises: selectedExercises,
    };
  });

  // Calculate weekly volume summary
  const landmarkMap = new Map(landmarks.map((l) => [l.muscleGroup, l]));
  const weeklyVolume: BuilderPreview["weeklyVolume"] = {};

  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (!weeklyVolume[ex.targetMuscle]) {
        const lm = landmarkMap.get(ex.targetMuscle);
        weeklyVolume[ex.targetMuscle] = {
          planned: 0,
          mev: lm?.mev ?? 0,
          mav: lm?.mav ?? 0,
          mrv: lm?.mrv ?? 0,
        };
      }
      weeklyVolume[ex.targetMuscle].planned += ex.sets;
    }
  }

  return {
    templateSlug: template.slug,
    templateName: template.name,
    splitType: template.splitType,
    totalWeeks: template.weeks,
    sessions,
    weeklyVolume,
  };
}

// ─── Convert Preview to SessionPlan ──────────────────────────────────

export function previewToSessionPlan(preview: BuilderPreview): SessionPlan {
  const weeks: SessionPlan["weeks"] = [];

  for (let w = 1; w <= preview.totalWeeks; w++) {
    const rir = getRirForWeek(w, preview.totalWeeks);

    weeks.push({
      weekNumber: w,
      isDeload: false,
      sessions: preview.sessions.map((session) => ({
        dayNumber: session.dayNumber,
        sessionName: session.name,
        exercises: session.exercises.map(
          (ex): SessionPlanExercise => ({
            exerciseName: ex.exerciseName,
            muscleGroup: ex.targetMuscle,
            sets: ex.sets,
            repRangeMin: ex.repRangeMin,
            repRangeMax: ex.repRangeMax,
            rirTarget: rir,
            restSeconds: ex.restSeconds,
          }),
        ),
      })),
    });
  }

  return {
    templateSlug: preview.templateSlug,
    weeks,
  };
}
