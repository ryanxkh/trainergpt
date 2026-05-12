import { Suspense } from "react";
import type { Metadata } from "next";
import { generateSessionBriefing } from "@/lib/briefing";
import { requireUserId } from "@/lib/auth-utils";
import { generateSuggestionCards } from "@/lib/coach-suggestions";
import CoachClient from "./_components/coach-client";

export const metadata: Metadata = {
  title: "Coach",
  description: "Chat with your AI hypertrophy coach.",
};

async function CoachWithBriefing() {
  const userId = await requireUserId();
  const briefingResult = await generateSessionBriefing(userId);
  const initialSuggestions = generateSuggestionCards(
    briefingResult?.briefing ?? null
  );
  return <CoachClient initialSuggestions={initialSuggestions} />;
}

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <CoachWithBriefing />
    </Suspense>
  );
}
