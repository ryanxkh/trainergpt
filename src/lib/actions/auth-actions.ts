"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ error?: string }> {
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    name: name || null,
    passwordHash,
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/coach",
  });

  return {};
}
