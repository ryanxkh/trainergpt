import { Suspense } from "react";
import type { Metadata } from "next";
import CoachClient from "./_components/coach-client";

export const metadata: Metadata = {
  title: "Coach",
  description: "Chat with your AI hypertrophy coach.",
};

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <CoachClient />
    </Suspense>
  );
}
