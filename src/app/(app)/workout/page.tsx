import type { Metadata } from "next";
import WorkoutClient from "./_components/workout-client";

export const metadata: Metadata = {
  title: "Today",
  description: "Log your workout and track sets in real time.",
};

export default function WorkoutPage() {
  return <WorkoutClient enableTimer />;
}
