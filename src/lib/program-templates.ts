// ─── Pre-Loaded Program Templates ────────────────────────────────────
// Curated hypertrophy programs informed by Nippard, Buttermore, Norton,
// Israetel (RP), Schoenfeld, and Helms research.
//
// Templates define the program SHAPE (sessions, exercise slots, movement
// patterns). The program builder fills slots with real exercises based on
// the user's equipment access and sets volume from their landmarks.

// ─── Types ───────────────────────────────────────────────────────────

export type ExerciseSlot = {
  targetMuscle: string; // Primary muscle group
  movementPattern:
    | "horizontal_press"
    | "vertical_press"
    | "horizontal_pull"
    | "vertical_pull"
    | "squat"
    | "hip_hinge"
    | "isolation"
    | "carry";
  role: "compound" | "isolation";
  repRange: [number, number];
  restSeconds: number;
  preferStretchFocused?: boolean;
  preferHighSfr?: boolean;
};

export type TemplateSession = {
  name: string;
  dayNumber: number; // 1=Mon..7=Sun
  slots: ExerciseSlot[];
};

export type ProgramTemplate = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  splitType: "full_body" | "upper_lower" | "push_pull_legs" | "custom";
  daysPerWeek: number;
  weeks: number;
  targetLevel: "beginner" | "intermediate" | "advanced";
  tags: string[];
  sessions: TemplateSession[];
};

// ─── Equipment Access Mapping ────────────────────────────────────────

export const EQUIPMENT_BY_ACCESS: Record<string, string[]> = {
  home: ["bodyweight", "dumbbell", "kettlebell", "barbell", "band"],
  apartment: [
    "bodyweight",
    "dumbbell",
    "kettlebell",
    "machine",
    "cable",
    "barbell",
    "ez_bar",
  ],
  commercial: [
    "machine",
    "cable",
    "smith_machine",
    "dumbbell",
    "ez_bar",
    "barbell",
    "kettlebell",
    "bodyweight",
  ],
  specialty: [
    "machine",
    "cable",
    "smith_machine",
    "dumbbell",
    "ez_bar",
    "barbell",
    "kettlebell",
    "bodyweight",
    "other",
  ],
};

// Machine/cable first — Nippard SFR philosophy
export const EQUIPMENT_PREFERENCE = [
  "machine",
  "cable",
  "smith_machine",
  "dumbbell",
  "ez_bar",
  "barbell",
  "kettlebell",
  "bodyweight",
];

// ─── Helper: common slot patterns ────────────────────────────────────

const SLOTS = {
  // Chest
  chestCompound: {
    targetMuscle: "chest",
    movementPattern: "horizontal_press" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 150,
  },
  chestIsolation: {
    targetMuscle: "chest",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 90,
    preferStretchFocused: true,
    preferHighSfr: true,
  },
  // Back
  backHorizontalPull: {
    targetMuscle: "back",
    movementPattern: "horizontal_pull" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 150,
  },
  backVerticalPull: {
    targetMuscle: "back",
    movementPattern: "vertical_pull" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 150,
  },
  backIsolation: {
    targetMuscle: "back",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 90,
    preferStretchFocused: true,
  },
  // Quads
  quadCompound: {
    targetMuscle: "quads",
    movementPattern: "squat" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 180,
  },
  quadIsolation: {
    targetMuscle: "quads",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 90,
    preferHighSfr: true,
  },
  // Hamstrings
  hamstringCompound: {
    targetMuscle: "hamstrings",
    movementPattern: "hip_hinge" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 150,
  },
  hamstringIsolation: {
    targetMuscle: "hamstrings",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 90,
    preferHighSfr: true,
  },
  // Glutes
  gluteCompound: {
    targetMuscle: "glutes",
    movementPattern: "hip_hinge" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 150,
  },
  gluteIsolation: {
    targetMuscle: "glutes",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [12, 15] as [number, number],
    restSeconds: 90,
    preferHighSfr: true,
  },
  // Shoulders
  shoulderCompound: {
    targetMuscle: "side_delts",
    movementPattern: "vertical_press" as const,
    role: "compound" as const,
    repRange: [8, 12] as [number, number],
    restSeconds: 120,
  },
  sideDeltsIsolation: {
    targetMuscle: "side_delts",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [12, 15] as [number, number],
    restSeconds: 60,
    preferHighSfr: true,
  },
  rearDeltsIsolation: {
    targetMuscle: "rear_delts",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [12, 15] as [number, number],
    restSeconds: 60,
    preferHighSfr: true,
  },
  // Arms
  bicepsIsolation: {
    targetMuscle: "biceps",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 12] as [number, number],
    restSeconds: 90,
    preferStretchFocused: true,
  },
  tricepsIsolation: {
    targetMuscle: "triceps",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 12] as [number, number],
    restSeconds: 90,
  },
  // Calves
  calvesIsolation: {
    targetMuscle: "calves",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 90,
  },
  // Abs
  absIsolation: {
    targetMuscle: "abs",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 60,
  },
  // Traps
  trapsIsolation: {
    targetMuscle: "traps",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [10, 12] as [number, number],
    restSeconds: 90,
  },

  // ─── Power variants (lower rep ranges for Power Hypertrophy) ───
  chestPower: {
    targetMuscle: "chest",
    movementPattern: "horizontal_press" as const,
    role: "compound" as const,
    repRange: [6, 8] as [number, number],
    restSeconds: 180,
  },
  backPower: {
    targetMuscle: "back",
    movementPattern: "horizontal_pull" as const,
    role: "compound" as const,
    repRange: [6, 8] as [number, number],
    restSeconds: 180,
  },
  shoulderPower: {
    targetMuscle: "side_delts",
    movementPattern: "vertical_press" as const,
    role: "compound" as const,
    repRange: [6, 8] as [number, number],
    restSeconds: 180,
  },
  quadPower: {
    targetMuscle: "quads",
    movementPattern: "squat" as const,
    role: "compound" as const,
    repRange: [6, 8] as [number, number],
    restSeconds: 180,
  },
  hingePower: {
    targetMuscle: "hamstrings",
    movementPattern: "hip_hinge" as const,
    role: "compound" as const,
    repRange: [6, 8] as [number, number],
    restSeconds: 180,
  },

  // ─── High-rep hypertrophy variants ─────────────────────────────
  chestHighRep: {
    targetMuscle: "chest",
    movementPattern: "horizontal_press" as const,
    role: "compound" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 120,
  },
  backHighRep: {
    targetMuscle: "back",
    movementPattern: "horizontal_pull" as const,
    role: "compound" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 120,
  },
  quadHighRep: {
    targetMuscle: "quads",
    movementPattern: "squat" as const,
    role: "compound" as const,
    repRange: [10, 15] as [number, number],
    restSeconds: 150,
  },
  hamHighRep: {
    targetMuscle: "hamstrings",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [12, 15] as [number, number],
    restSeconds: 90,
    preferHighSfr: true,
  },
  calvesHighRep: {
    targetMuscle: "calves",
    movementPattern: "isolation" as const,
    role: "isolation" as const,
    repRange: [15, 20] as [number, number],
    restSeconds: 60,
  },
} as const;

// ─── Templates ───────────────────────────────────────────────────────

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. UPPER/LOWER HYPERTROPHY — 5 days (U/L/U/L/U)
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "upper-lower-hypertrophy",
    name: "Upper/Lower Hypertrophy",
    subtitle: "5 days — balanced muscle growth",
    description:
      "The workhorse split. Three upper and two lower sessions per week, with enough frequency to drive growth across every muscle group. Lower sessions pack extra volume to compensate for fewer days. Machine and cable-focused for maximum stimulus-to-fatigue ratio.",
    splitType: "upper_lower",
    daysPerWeek: 5,
    weeks: 4,
    targetLevel: "intermediate",
    tags: ["balanced", "popular", "5-day"],
    sessions: [
      // Upper A — Chest & Back emphasis
      {
        name: "Upper A",
        dayNumber: 1,
        slots: [
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.sideDeltsIsolation,
          SLOTS.chestIsolation,
          SLOTS.backIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
      // Lower A — Quad emphasis
      {
        name: "Lower A",
        dayNumber: 2,
        slots: [
          SLOTS.quadCompound,
          SLOTS.hamstringCompound,
          SLOTS.gluteIsolation,
          SLOTS.quadIsolation,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Upper B — Back & Chest emphasis
      {
        name: "Upper B",
        dayNumber: 4,
        slots: [
          SLOTS.backVerticalPull,
          SLOTS.chestCompound,
          SLOTS.rearDeltsIsolation,
          SLOTS.backHorizontalPull,
          SLOTS.bicepsIsolation,
          SLOTS.chestIsolation,
        ],
      },
      // Lower B — Hamstring & Glute emphasis
      {
        name: "Lower B",
        dayNumber: 5,
        slots: [
          SLOTS.hamstringCompound,
          SLOTS.quadCompound,
          SLOTS.gluteCompound,
          SLOTS.hamstringIsolation,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Upper C — Shoulders & Arms
      {
        name: "Upper C",
        dayNumber: 6,
        slots: [
          SLOTS.shoulderCompound,
          SLOTS.chestCompound,
          SLOTS.backVerticalPull,
          SLOTS.sideDeltsIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. PUSH/PULL/LEGS — 6 days (PPL × 2)
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "push-pull-legs",
    name: "Push/Pull/Legs",
    subtitle: "6 days — high frequency, max volume",
    description:
      "Hit every muscle twice per week with dedicated push, pull, and leg sessions. High frequency meets high volume — ideal for intermediate to advanced lifters who can train 6 days. Each session has a distinct focus with full exercise variety across A/B days.",
    splitType: "push_pull_legs",
    daysPerWeek: 6,
    weeks: 4,
    targetLevel: "intermediate",
    tags: ["high-frequency", "advanced", "6-day"],
    sessions: [
      // Push A — Chest focus
      {
        name: "Push A",
        dayNumber: 1,
        slots: [
          SLOTS.chestCompound,
          SLOTS.chestCompound, // second chest angle
          SLOTS.sideDeltsIsolation,
          SLOTS.chestIsolation,
          SLOTS.tricepsIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
      // Pull A — Lat focus
      {
        name: "Pull A",
        dayNumber: 2,
        slots: [
          SLOTS.backVerticalPull,
          SLOTS.backHorizontalPull,
          SLOTS.rearDeltsIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.bicepsIsolation,
        ],
      },
      // Legs A — Quad focus
      {
        name: "Legs A",
        dayNumber: 3,
        slots: [
          SLOTS.quadCompound,
          SLOTS.hamstringCompound,
          SLOTS.quadIsolation,
          SLOTS.gluteIsolation,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Push B — Shoulder focus
      {
        name: "Push B",
        dayNumber: 4,
        slots: [
          SLOTS.shoulderCompound,
          SLOTS.chestCompound,
          SLOTS.sideDeltsIsolation,
          SLOTS.chestIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
      // Pull B — Mid-back focus
      {
        name: "Pull B",
        dayNumber: 5,
        slots: [
          SLOTS.backHorizontalPull,
          SLOTS.backVerticalPull,
          SLOTS.rearDeltsIsolation,
          SLOTS.trapsIsolation,
          SLOTS.bicepsIsolation,
        ],
      },
      // Legs B — Hamstring/Glute focus
      {
        name: "Legs B",
        dayNumber: 6,
        slots: [
          SLOTS.hamstringCompound,
          SLOTS.quadCompound,
          SLOTS.hamstringIsolation,
          SLOTS.gluteCompound,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. FULL BODY FOUNDATIONS — 3 days
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "full-body-foundations",
    name: "Full Body Foundations",
    subtitle: "3 days — efficient, beginner-friendly",
    description:
      "Three full-body sessions per week — the most time-efficient way to build muscle. Every session trains all major muscle groups with compound-heavy programming. Perfect for beginners or anyone with limited training days. Research shows 2-3x frequency per muscle is optimal for growth.",
    splitType: "full_body",
    daysPerWeek: 3,
    weeks: 4,
    targetLevel: "beginner",
    tags: ["beginner", "efficient", "3-day"],
    sessions: [
      // Full Body A — Quad & Chest lead
      {
        name: "Full Body A",
        dayNumber: 1,
        slots: [
          SLOTS.quadCompound,
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.sideDeltsIsolation,
          SLOTS.hamstringIsolation,
          SLOTS.bicepsIsolation,
        ],
      },
      // Full Body B — Hinge & Back lead
      {
        name: "Full Body B",
        dayNumber: 3,
        slots: [
          SLOTS.hamstringCompound,
          SLOTS.backVerticalPull,
          SLOTS.chestIsolation,
          SLOTS.quadIsolation,
          SLOTS.tricepsIsolation,
          SLOTS.rearDeltsIsolation,
        ],
      },
      // Full Body C — Compound variety
      {
        name: "Full Body C",
        dayNumber: 5,
        slots: [
          SLOTS.quadCompound,
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.gluteCompound,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. FULL BODY INTERMEDIATE — 4 days
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "full-body-intermediate",
    name: "Full Body Intermediate",
    subtitle: "4 days — balanced frequency & recovery",
    description:
      "Four full-body sessions per week — more volume capacity than 3-day while maintaining high frequency per muscle. Alternates emphasis between session pairs. Inspired by Nippard's Min-Max approach: minimum exercises, maximum stimulus per set.",
    splitType: "full_body",
    daysPerWeek: 4,
    weeks: 4,
    targetLevel: "intermediate",
    tags: ["intermediate", "balanced", "4-day"],
    sessions: [
      // Full Body A — Chest/Quad/Back lead
      {
        name: "Full Body A",
        dayNumber: 1,
        slots: [
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.quadCompound,
          SLOTS.sideDeltsIsolation,
          SLOTS.hamstringIsolation,
          SLOTS.calvesIsolation,
        ],
      },
      // Full Body B — Back/Hinge lead
      {
        name: "Full Body B",
        dayNumber: 2,
        slots: [
          SLOTS.backVerticalPull,
          SLOTS.chestIsolation,
          SLOTS.hamstringCompound,
          SLOTS.quadIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Full Body C — Chest/Quad/Back variation
      {
        name: "Full Body C",
        dayNumber: 4,
        slots: [
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.quadCompound,
          SLOTS.rearDeltsIsolation,
          SLOTS.gluteCompound,
          SLOTS.tricepsIsolation,
        ],
      },
      // Full Body D — Back/Isolation focus
      {
        name: "Full Body D",
        dayNumber: 5,
        slots: [
          SLOTS.backVerticalPull,
          SLOTS.chestIsolation,
          SLOTS.hamstringIsolation,
          SLOTS.sideDeltsIsolation,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. BOOTY BUILDER 5x — 3 Lower / 2 Upper
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "booty-builder-5x",
    name: "Booty Builder 5x",
    subtitle: "5 days — glute & lower body focused, designed for women",
    description:
      "Three lower body sessions and two upper sessions per week, with glutes trained in every lower day. Hip thrusts, hinges, and abduction work hit glutes across the full force-length curve — shortened, lengthened, and isolated. Upper sessions keep everything balanced. Inspired by Buttermore's evidence-based female programming.",
    splitType: "custom",
    daysPerWeek: 5,
    weeks: 4,
    targetLevel: "intermediate",
    tags: ["glute-focus", "women", "5-day"],
    sessions: [
      // Lower A — Quad & Glute
      {
        name: "Lower A",
        dayNumber: 1,
        slots: [
          SLOTS.quadCompound,
          SLOTS.gluteCompound, // hip thrust
          SLOTS.hamstringCompound,
          SLOTS.gluteIsolation, // abduction/kickback
          SLOTS.quadIsolation,
          SLOTS.calvesIsolation,
        ],
      },
      // Upper A
      {
        name: "Upper A",
        dayNumber: 2,
        slots: [
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.shoulderCompound,
          SLOTS.rearDeltsIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
      // Lower B — Hinge & Glute
      {
        name: "Lower B",
        dayNumber: 4,
        slots: [
          SLOTS.hamstringCompound, // RDL
          SLOTS.gluteCompound, // hip thrust variant
          SLOTS.quadCompound,
          SLOTS.gluteIsolation, // hip abduction
          SLOTS.hamstringIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Lower C — Unilateral & Glute
      {
        name: "Lower C",
        dayNumber: 5,
        slots: [
          SLOTS.quadCompound, // lunges/split squat
          SLOTS.gluteCompound,
          SLOTS.gluteIsolation,
          SLOTS.hamstringIsolation,
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Upper B
      {
        name: "Upper B",
        dayNumber: 6,
        slots: [
          SLOTS.backVerticalPull,
          SLOTS.chestCompound,
          SLOTS.sideDeltsIsolation,
          SLOTS.backIsolation,
          SLOTS.chestIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. BOOTY BUILDER 4x — 2 Lower / 2 Upper (glute heavy)
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "booty-builder-4x",
    name: "Booty Builder 4x",
    subtitle: "4 days — glute & lower body focused, designed for women",
    description:
      "Two lower and two upper sessions per week, with both lower days heavily glute-focused. Hip thrusts appear in both sessions with hamstring and abduction work rounding out full glute coverage. Directly inspired by Buttermore's 4-day female-focused upper/lower program.",
    splitType: "upper_lower",
    daysPerWeek: 4,
    weeks: 4,
    targetLevel: "beginner",
    tags: ["glute-focus", "women", "4-day"],
    sessions: [
      // Lower A — Squat & Hip Thrust
      {
        name: "Lower A",
        dayNumber: 1,
        slots: [
          SLOTS.quadCompound,
          SLOTS.gluteCompound, // hip thrust
          SLOTS.hamstringIsolation,
          SLOTS.gluteIsolation, // abduction
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Upper A
      {
        name: "Upper A",
        dayNumber: 2,
        slots: [
          SLOTS.shoulderCompound,
          SLOTS.backVerticalPull,
          SLOTS.chestCompound,
          SLOTS.backHorizontalPull,
          SLOTS.sideDeltsIsolation,
          SLOTS.rearDeltsIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
      // Lower B — Hinge & Hip Thrust
      {
        name: "Lower B",
        dayNumber: 4,
        slots: [
          SLOTS.hamstringCompound, // deadlift/RDL
          SLOTS.quadCompound,
          SLOTS.gluteCompound, // hip thrust variant
          SLOTS.gluteIsolation, // kickback
          SLOTS.calvesIsolation,
          SLOTS.absIsolation,
        ],
      },
      // Upper B
      {
        name: "Upper B",
        dayNumber: 5,
        slots: [
          SLOTS.chestCompound,
          SLOTS.backVerticalPull,
          SLOTS.shoulderCompound,
          SLOTS.backHorizontalPull,
          SLOTS.sideDeltsIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.tricepsIsolation,
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. POWER HYPERTROPHY — 5 days (PHAT-inspired, adapted)
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "power-hypertrophy",
    name: "Power Hypertrophy",
    subtitle: "5 days — strength meets size, PHAT-inspired",
    description:
      "Two power days (6-8 reps, heavier loads) plus three hypertrophy days (10-15 reps, higher volume). Every muscle hit twice per week with deliberately different stimuli. Getting stronger at low reps unlocks heavier loads on hypertrophy work. Adapted from Norton's PHAT with volume landmarks applied.",
    splitType: "custom",
    daysPerWeek: 5,
    weeks: 4,
    targetLevel: "intermediate",
    tags: ["strength", "hypertrophy", "DUP", "5-day"],
    sessions: [
      // Upper Power — heavy compounds, low reps
      {
        name: "Upper Power",
        dayNumber: 1,
        slots: [
          SLOTS.chestPower,
          SLOTS.backPower,
          SLOTS.shoulderPower,
          { ...SLOTS.backIsolation, repRange: [8, 10] as [number, number] },
          { ...SLOTS.tricepsIsolation, repRange: [8, 10] as [number, number] },
          { ...SLOTS.bicepsIsolation, repRange: [8, 10] as [number, number] },
        ],
      },
      // Lower Power — heavy compounds, low reps
      {
        name: "Lower Power",
        dayNumber: 2,
        slots: [
          SLOTS.quadPower,
          SLOTS.hingePower,
          { ...SLOTS.quadIsolation, repRange: [8, 10] as [number, number] },
          { ...SLOTS.hamstringIsolation, repRange: [8, 10] as [number, number] },
          SLOTS.calvesIsolation,
        ],
      },
      // Back & Shoulders Hypertrophy — high rep, volume focused
      {
        name: "Back & Shoulders",
        dayNumber: 4,
        slots: [
          SLOTS.backHorizontalPull,
          SLOTS.backVerticalPull,
          SLOTS.sideDeltsIsolation,
          SLOTS.rearDeltsIsolation,
          SLOTS.backIsolation,
          SLOTS.trapsIsolation,
        ],
      },
      // Lower Hypertrophy — high rep, volume focused
      {
        name: "Legs Hypertrophy",
        dayNumber: 5,
        slots: [
          SLOTS.quadHighRep,
          SLOTS.quadCompound,
          SLOTS.hamHighRep,
          SLOTS.gluteCompound,
          SLOTS.calvesHighRep,
          SLOTS.absIsolation,
        ],
      },
      // Chest & Arms Hypertrophy — high rep, volume focused
      {
        name: "Chest & Arms",
        dayNumber: 6,
        slots: [
          SLOTS.chestCompound,
          SLOTS.chestIsolation,
          SLOTS.bicepsIsolation,
          SLOTS.tricepsIsolation,
          { ...SLOTS.bicepsIsolation, repRange: [12, 15] as [number, number] },
          { ...SLOTS.tricepsIsolation, repRange: [12, 15] as [number, number] },
        ],
      },
    ],
  },
];

// ─── Lookup ──────────────────────────────────────────────────────────

export function getTemplateBySlug(slug: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.slug === slug);
}
