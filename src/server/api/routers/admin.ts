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
        // Try to check if tables exist by testing a location query
        try {
          await ctx.db.location.count();
          // If this succeeds, tables exist
          const existingAdmin = await ctx.db.user.findUnique({
            where: { email: "admin@pathdrive.com" },
          });

          if (existingAdmin) {
            return { message: "Database already initialized with all tables" };
          }
        } catch (tableError) {
          // Tables don't exist, continue with creation
          console.log("Tables don't exist, proceeding with creation...");
        }
      } catch (error: any) {
        // If we get a "table does not exist" error, we need to create the schema
        if (error?.message?.includes('does not exist') || error?.code === 'P2021') {
          try {
            // Use Prisma's $executeRawUnsafe to create tables manually
            console.log("Creating database schema...");
            
            // Create enum types first (use IF NOT EXISTS equivalent)
            try {
              await ctx.db.$executeRawUnsafe(`
                DO $$ BEGIN
                  CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
                EXCEPTION
                  WHEN duplicate_object THEN null;
                END $$;
              `);
              
              await ctx.db.$executeRawUnsafe(`
                DO $$ BEGIN
                  CREATE TYPE "EndpointType" AS ENUM ('POP', 'DC', 'CLS');
                EXCEPTION
                  WHEN duplicate_object THEN null;
                END $$;
              `);
              
              await ctx.db.$executeRawUnsafe(`
                DO $$ BEGIN
                  CREATE TYPE "Capacity" AS ENUM ('TEN_G', 'HUNDRED_G', 'FOUR_HUNDRED_G');
                EXCEPTION
                  WHEN duplicate_object THEN null;
                END $$;
              `);
              
              await ctx.db.$executeRawUnsafe(`
                DO $$ BEGIN
                  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'ACTIVE', 'CANCELLED');
                EXCEPTION
                  WHEN duplicate_object THEN null;
                END $$;
              `);
              
              await ctx.db.$executeRawUnsafe(`
                DO $$ BEGIN
                  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
                EXCEPTION
                  WHEN duplicate_object THEN null;
                END $$;
              `);
            } catch (enumError) {
              console.log("Some enums may already exist, continuing...");
            }
            
            // Create User table with all required fields
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "User" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT,
                "email" TEXT UNIQUE,
                "emailVerified" TIMESTAMP(3),
                "image" TEXT,
                "password" TEXT,
                "role" "UserRole" NOT NULL DEFAULT 'USER',
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

            // Create Location table
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "Location" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "type" "EndpointType" NOT NULL,
                "region" TEXT NOT NULL,
                "city" TEXT NOT NULL,
                "latitude" DOUBLE PRECISION NOT NULL,
                "longitude" DOUBLE PRECISION NOT NULL,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
            `);

            // Create Route table
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "Route" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "aEndId" TEXT NOT NULL,
                "bEndId" TEXT NOT NULL,
                "distance" DOUBLE PRECISION,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "isVisible" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Route_aEndId_fkey" FOREIGN KEY ("aEndId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "Route_bEndId_fkey" FOREIGN KEY ("bEndId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
              );
            `);

            // Create RouteCapacity table
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "RouteCapacity" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "routeId" TEXT NOT NULL,
                "capacity" "Capacity" NOT NULL,
                "pricePerUnit" DOUBLE PRECISION NOT NULL,
                "availableUnits" INTEGER NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "RouteCapacity_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE CASCADE ON UPDATE CASCADE
              );
            `);

            // Create Order table
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "Order" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
                "totalAmount" DOUBLE PRECISION NOT NULL,
                "currency" TEXT NOT NULL DEFAULT 'USD',
                "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
                "paymentIntentId" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
              );
            `);

            // Create OrderItem table
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "OrderItem" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "orderId" TEXT NOT NULL,
                "routeId" TEXT NOT NULL,
                "routeCapacityId" TEXT NOT NULL,
                "quantity" INTEGER NOT NULL,
                "unitPrice" DOUBLE PRECISION NOT NULL,
                "totalPrice" DOUBLE PRECISION NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "OrderItem_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "OrderItem_routeCapacityId_fkey" FOREIGN KEY ("routeCapacityId") REFERENCES "RouteCapacity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
              );
            `);

            // Create Post table
            await ctx.db.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "Post" (
                "id" SERIAL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "createdById" TEXT NOT NULL,
                CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
              );
            `);

            // Create indexes
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Location_region_city_idx" ON "Location"("region", "city");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Location_type_idx" ON "Location"("type");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Route_aEndId_bEndId_idx" ON "Route"("aEndId", "bEndId");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Route_isActive_isVisible_idx" ON "Route"("isActive", "isVisible");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RouteCapacity_routeId_capacity_idx" ON "RouteCapacity"("routeId", "capacity");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");`);
            await ctx.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Post_name_idx" ON "Post"("name");`);
            
            // Create unique constraints
            await ctx.db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");`);
            await ctx.db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Route_aEndId_bEndId_key" ON "Route"("aEndId", "bEndId");`);
            await ctx.db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RouteCapacity_routeId_capacity_key" ON "RouteCapacity"("routeId", "capacity");`);
            await ctx.db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");`);

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

  fixSchema: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log("Fixing database schema by adding missing enum types...");
        
        // Create enum types (safe to run multiple times)
        await ctx.db.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);
        
        await ctx.db.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "EndpointType" AS ENUM ('POP', 'DC', 'CLS');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);
        
        await ctx.db.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "Capacity" AS ENUM ('TEN_G', 'HUNDRED_G', 'FOUR_HUNDRED_G');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);
        
        await ctx.db.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'ACTIVE', 'CANCELLED');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);
        
        await ctx.db.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);

        // Try to alter the User table to use the proper enum type
        try {
          await ctx.db.$executeRawUnsafe(`
            ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
          `);
        } catch (alterError) {
          console.log("User table may already have correct role type");
        }

        return { message: "Database schema fixed successfully! Enum types added and User table updated." };
      } catch (error) {
        console.error("Schema fix error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Schema fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  checkDatabase: publicProcedure
    .query(async ({ ctx }) => {
      const results: any = {};
      
      // Check each table
      const tables = ['User', 'Location', 'Route', 'RouteCapacity', 'Order', 'OrderItem'];
      
      for (const table of tables) {
        try {
          const result = await ctx.db.$queryRaw`SELECT count(*) FROM ${table}`;
          results[table] = { exists: true, count: result };
        } catch (error: any) {
          results[table] = { 
            exists: false, 
            error: error.message?.substring(0, 100) 
          };
        }
      }
      
      return results;
    }),
});