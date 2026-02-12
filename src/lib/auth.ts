import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Find or create user in our database
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
        nextUrl.pathname.startsWith("/history");

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
});
