import { type DefaultSession, type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }

        console.log("Attempting login for email:", credentials.email);

        // Handle prepared statement conflicts by using a fresh query
        let user;
        try {
          user = await db.user.findUnique({
            where: { email: credentials.email as string }
          });
        } catch (dbError: any) {
          console.log("Database error during user lookup:", dbError.message);
          // Try with raw query to avoid prepared statement conflicts
          try {
            const result = await db.$queryRaw`
              SELECT id, email, name, password, role 
              FROM "User" 
              WHERE email = ${credentials.email as string}
              LIMIT 1
            `;
            user = Array.isArray(result) && result.length > 0 ? result[0] : null;
            console.log("Raw query successful, user found:", !!user);
          } catch (rawError: any) {
            console.log("Raw query also failed:", rawError.message);
            return null;
          }
        }

        console.log("User found:", user ? { id: user.id, email: user.email, hasPassword: !!user.password } : "Not found");

        if (!user || !user.password) {
          console.log("User not found or no password");
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("Password validation result:", isValidPassword);

        if (!isValidPassword) {
          console.log("Invalid password");
          return null;
        }

        console.log("Login successful for user:", user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    }),
    // DiscordProvider({
    //   clientId: process.env.AUTH_DISCORD_ID!,
    //   clientSecret: process.env.AUTH_DISCORD_SECRET!,
    // }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as any,
      },
    }),
  },
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/signin",
  },
};
