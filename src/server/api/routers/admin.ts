import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Simple function to generate CUID-like IDs
function generateId(): string {
  return 'c' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const adminRouter = createTRPCRouter({
  initializeDatabase: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Try to check if admin user already exists
        const existingAdmin = await ctx.db.user.findUnique({
          where: { email: "admin@pathdrive.com" },
        });

        if (existingAdmin) {
          return { message: "Database already initialized" };
        }
      } catch (error: any) {
        // If we get a "table does not exist" error, we need to create the schema
        if (error?.message?.includes('does not exist') || error?.code === 'P2021') {
          try {
            // Use Prisma's $executeRawUnsafe to create tables manually
            console.log("Creating database schema...");
            
            // Create User table with all required fields
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "User" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT,
                "email" TEXT UNIQUE,
                "emailVerified" TIMESTAMP(3),
                "image" TEXT,
                "password" TEXT,
                "role" TEXT NOT NULL DEFAULT 'USER',
                "companyName" TEXT,
                "companyDetails" TEXT,
                "billingAddress" TEXT,
                "resetToken" TEXT,
                "resetTokenExpiry" TIMESTAMP(3)
              );
            `);

            // Create Account table for NextAuth
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "Account" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "type" TEXT NOT NULL,
                "provider" TEXT NOT NULL,
                "providerAccountId" TEXT NOT NULL,
                "refresh_token" TEXT,
                "access_token" TEXT,
                "expires_at" INTEGER,
                "token_type" TEXT,
                "scope" TEXT,
                "id_token" TEXT,
                "session_state" TEXT,
                "refresh_token_expires_in" INTEGER,
                CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
              );
            `);

            // Create Session table for NextAuth
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "Session" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "sessionToken" TEXT NOT NULL UNIQUE,
                "userId" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
              );
            `);

            // Create VerificationToken table for NextAuth
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "VerificationToken" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL UNIQUE,
                "expires" TIMESTAMP(3) NOT NULL
              );
            `);

            console.log("Database schema created successfully");
          } catch (createError) {
            console.error("Failed to create database schema:", createError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create database schema: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
            });
          }
        } else {
          // Some other database error
          console.error("Database connection error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Database connection failed: ${error?.message || 'Unknown error'}. Please check your DATABASE_URL configuration.`,
          });
        }
      }

      try {
        // Create admin user using raw SQL to avoid Prisma model issues
        const adminId = generateId();
        const adminPassword = await bcrypt.hash("admin123", 12);
        
        await ctx.db.$executeRawUnsafe(`
          INSERT INTO "User" ("id", "email", "name", "password", "role", "companyName", "companyDetails", "billingAddress")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT ("email") DO NOTHING
        `, adminId, "admin@pathdrive.com", "Administrator", adminPassword, "ADMIN", "PathDrive Inc.", "Network Infrastructure Provider", "123 Tech Street, San Francisco, CA 94105");

        // Create sample user using raw SQL
        const userId = generateId();
        const userPassword = await bcrypt.hash("user123", 12);
        
        await ctx.db.$executeRawUnsafe(`
          INSERT INTO "User" ("id", "email", "name", "password", "role", "companyName", "companyDetails", "billingAddress")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT ("email") DO NOTHING
        `, userId, "user@example.com", "Sample User", userPassword, "USER", "Example Corp", "Technology Company", "456 Business Ave, New York, NY 10001");

        return { message: "Database initialized successfully! You can now register new users and log in with: admin@pathdrive.com / admin123" };
      } catch (error) {
        console.error("Database initialization error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure your DATABASE_URL is correctly configured and the database is accessible.`,
        });
      }
    }),
});