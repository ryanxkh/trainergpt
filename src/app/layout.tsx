import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { FlagValues } from "flags/react";
import * as flags from "@/lib/flags";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrainerGPT — AI Hypertrophy Coach",
  description:
    "An AI-powered hypertrophy training coach that builds, adapts, and progresses your workout program using evidence-based principles.",
};

async function ResolvedFlagValues() {
  const [model, advancedCoaching, charts, timer] = await Promise.all([
    flags.aiModel(),
    flags.enableAdvancedCoaching(),
    flags.showProgressCharts(),
    flags.enableWorkoutTimer(),
  ]);

  return (
    <FlagValues
      values={{
        "ai-model": model,
        "enable-advanced-coaching": advancedCoaching,
        "show-progress-charts": charts,
        "enable-workout-timer": timer,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <SpeedInsights />
        <Analytics />
        <Suspense fallback={null}>
          <ResolvedFlagValues />
        </Suspense>
      </body>
    </html>
  );
}
