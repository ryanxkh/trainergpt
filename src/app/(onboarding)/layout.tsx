import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function OnboardedRedirect() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = parseInt(session.user.id as string);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboardingComplete: true },
  });
  if (user?.onboardingComplete) {
    redirect("/coach");
  }
  return null;
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <OnboardedRedirect />
      </Suspense>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
