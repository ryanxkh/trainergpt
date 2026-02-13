import { auth } from "@/lib/auth";

export async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return parseInt(session.user.id as string);
}
