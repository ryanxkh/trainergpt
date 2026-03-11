import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile and training preferences.",
};
import { getSettingsData } from "./actions";
import { SettingsClient } from "./_components/settings-client";

async function SettingsLoader() {
  const data = await getSettingsData();
  return <SettingsClient data={data} />;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      }
    >
      <SettingsLoader />
    </Suspense>
  );
}
