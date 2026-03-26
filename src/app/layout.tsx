import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/offline-banner";
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: {
    default: "TrainerGPT — AI Hypertrophy Coach",
    template: "%s | TrainerGPT",
  },
  description:
    "An AI-powered hypertrophy training coach that builds, adapts, and progresses your workout program using evidence-based principles.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrainerGPT",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

async function ResolvedFlagValues() {
  const model = await flags.aiModel();

  return (
    <FlagValues
      values={{
        "ai-model": model,
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <OfflineBanner />
          {children}
          <Toaster />
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
        <Suspense fallback={null}>
          <ResolvedFlagValues />
        </Suspense>
      </body>
    </html>
  );
}
