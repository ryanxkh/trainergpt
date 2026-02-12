import { Suspense } from "react";
import CoachClient from "./_components/coach-client";

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <CoachClient />
    </Suspense>
  );
}
