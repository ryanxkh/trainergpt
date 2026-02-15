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
};

export type PreviousSetData = {
  weight: number;
  reps: number;
  rir: number | null;
  setNumber: number;
};

export type ExerciseDetail = {
  muscleGroups: { primary: string[]; secondary: string[] };
  equipment: string;
};

export type MesocycleContext = {
  name: string;
  currentWeek: number;
  totalWeeks: number;
  splitType: string;
};
