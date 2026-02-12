import { Suspense } from "react";
import { enableWorkoutTimer } from "@/lib/flags";
import WorkoutClient from "./_components/workout-client";

async function WorkoutWithFlags() {
  const timerEnabled = await enableWorkoutTimer();
  return <WorkoutClient enableTimer={timerEnabled} />;
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={null}>
      <WorkoutWithFlags />
    </Suspense>
  );
}
