export type SetType = "normal" | "myorep" | "dropset";

export type PrescribedExercise = {
  exerciseId: number;
  exerciseName: string;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  rirTarget: number;
  restSeconds: number;
};

export type LoggedSet = {
  id: number;
  exerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  setType: SetType;
};

export type PreviousSetData = {
  weight: number;
  reps: number;
  rir: number | null;
  setNumber: number;
  setType: SetType;
};

export type ExerciseDetail = {
  muscleGroups: { primary: string[]; secondary: string[] };
  equipment: string;
  movementPattern: string;
  sfrRating: string;
  isStretchFocused: boolean;
  repRangeOptimal: [number, number];
  defaultRestSeconds: number;
};

export type MesocycleContext = {
  name: string;
  currentWeek: number;
  totalWeeks: number;
  splitType: string;
};
