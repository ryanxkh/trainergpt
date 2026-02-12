import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: Request) {
  // Verify authorization — in production, use a secret token
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.REVALIDATION_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { path, tag } = body as { path?: string; tag?: string };

  if (path) {
    revalidatePath(path);
    return Response.json({ revalidated: true, path });
  }

  if (tag) {
    revalidateTag(tag, "default");
    return Response.json({ revalidated: true, tag });
  }

  // Default: revalidate the exercise library
  revalidatePath("/exercises");
  return Response.json({ revalidated: true, path: "/exercises" });
}
