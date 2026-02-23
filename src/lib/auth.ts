import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub,
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Credentials provider — authorize() already verified the user
      if (account?.provider === "credentials") return true;

      // OAuth providers — find or create user in our database
      const existing = await db.query.users.findFirst({
        where: eq(users.email, user.email),
      });

      if (!existing) {
        await db.insert(users).values({
          email: user.email,
          name: user.name ?? null,
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // Look up our internal user ID
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/workout") ||
        nextUrl.pathname.startsWith("/program") ||
        nextUrl.pathname.startsWith("/coach") ||
        nextUrl.pathname.startsWith("/history") ||
        nextUrl.pathname.startsWith("/exercises") ||
        nextUrl.pathname.startsWith("/settings");

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
});
