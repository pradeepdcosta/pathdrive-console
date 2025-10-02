import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Simple function to generate CUID-like IDs
function generateId(): string {
  return 'c' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const adminRouter = createTRPCRouter({
  setupSchema: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Try to test if tables already exist by running a simple query
        try {
          await ctx.db.user.count();
          return { message: "Database schema already exists! You can proceed to initialize with sample data." };
        } catch (error) {
          // Tables don't exist, we'll create them using migration SQL
          console.log("Tables don't exist, creating schema using migration...");
        }

        // Run the migration SQL directly
        const migrationSql = `
          -- CreateEnum
          DO $$ BEGIN
            CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;

          DO $$ BEGIN
            CREATE TYPE "EndpointType" AS ENUM ('POP', 'DC', 'CLS');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;

          DO $$ BEGIN
            CREATE TYPE "Capacity" AS ENUM ('TEN_G', 'HUNDRED_G', 'FOUR_HUNDRED_G');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;

          DO $$ BEGIN
            CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'ACTIVE', 'CANCELLED');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;

          DO $$ BEGIN
            CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;

          -- CreateTable
          CREATE TABLE IF NOT EXISTS "User" (
              "id" TEXT NOT NULL,
              "name" TEXT,
              "email" TEXT,
              "emailVerified" TIMESTAMP(3),
              "image" TEXT,
              "password" TEXT,
              "role" "UserRole" NOT NULL DEFAULT 'USER',
              "companyName" TEXT,
              "companyDetails" TEXT,
              "billingAddress" TEXT,
              "resetToken" TEXT,
              "resetTokenExpiry" TIMESTAMP(3),
              CONSTRAINT "User_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "Location" (
              "id" TEXT NOT NULL,
              "name" TEXT NOT NULL,
              "type" "EndpointType" NOT NULL,
              "region" TEXT NOT NULL,
              "city" TEXT NOT NULL,
              "latitude" DOUBLE PRECISION NOT NULL,
              "longitude" DOUBLE PRECISION NOT NULL,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "Route" (
              "id" TEXT NOT NULL,
              "name" TEXT NOT NULL,
              "aEndId" TEXT NOT NULL,
              "bEndId" TEXT NOT NULL,
              "distance" DOUBLE PRECISION,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "isVisible" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "RouteCapacity" (
              "id" TEXT NOT NULL,
              "routeId" TEXT NOT NULL,
              "capacity" "Capacity" NOT NULL,
              "pricePerUnit" DOUBLE PRECISION NOT NULL,
              "availableUnits" INTEGER NOT NULL,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "RouteCapacity_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "Order" (
              "id" TEXT NOT NULL,
              "userId" TEXT NOT NULL,
              "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
              "totalAmount" DOUBLE PRECISION NOT NULL,
              "currency" TEXT NOT NULL DEFAULT 'USD',
              "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
              "paymentIntentId" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "OrderItem" (
              "id" TEXT NOT NULL,
              "orderId" TEXT NOT NULL,
              "routeId" TEXT NOT NULL,
              "routeCapacityId" TEXT NOT NULL,
              "quantity" INTEGER NOT NULL,
              "unitPrice" DOUBLE PRECISION NOT NULL,
              "totalPrice" DOUBLE PRECISION NOT NULL,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "Account" (
              "id" TEXT NOT NULL,
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
              CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "Session" (
              "id" TEXT NOT NULL,
              "sessionToken" TEXT NOT NULL,
              "userId" TEXT NOT NULL,
              "expires" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "VerificationToken" (
              "identifier" TEXT NOT NULL,
              "token" TEXT NOT NULL,
              "expires" TIMESTAMP(3) NOT NULL
          );

          CREATE TABLE IF NOT EXISTS "Post" (
              "id" SERIAL NOT NULL,
              "name" TEXT NOT NULL,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              "createdById" TEXT NOT NULL,
              CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
          );

          -- Create indexes
          CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
          CREATE INDEX IF NOT EXISTS "Location_region_city_idx" ON "Location"("region", "city");
          CREATE INDEX IF NOT EXISTS "Location_type_idx" ON "Location"("type");
          CREATE UNIQUE INDEX IF NOT EXISTS "Route_aEndId_bEndId_key" ON "Route"("aEndId", "bEndId");
          CREATE INDEX IF NOT EXISTS "Route_isActive_isVisible_idx" ON "Route"("isActive", "isVisible");
          CREATE UNIQUE INDEX IF NOT EXISTS "RouteCapacity_routeId_capacity_key" ON "RouteCapacity"("routeId", "capacity");
          CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
          CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
          CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
          CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
          CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
          CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
          CREATE INDEX IF NOT EXISTS "Post_name_idx" ON "Post"("name");
        `;

        // Execute the migration in smaller chunks to avoid prepared statement issues
        const statements = migrationSql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
          try {
            await ctx.db.$executeRawUnsafe(statement.trim() + ';');
          } catch (error: any) {
            // Continue with other statements even if one fails (table might already exist)
            console.log(`Statement execution note: ${error.message}`);
          }
        }

        // Test if schema was created successfully
        try {
          await ctx.db.user.count();
          return { message: "Database schema created successfully! All tables have been set up. You can now initialize with sample data." };
        } catch (testError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Schema creation completed but tables are not accessible. Please check your database permissions.",
          });
        }

      } catch (error: any) {
        console.error("Schema setup failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create schema: ${error.message}`,
        });
      }
    }),

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
          // Tables don't exist, we need to create them
          console.log("Tables don't exist, need to create schema first");
          
          // Instead of complex raw SQL, let's try a simpler approach
          // Check if we can create sample data, which will fail if tables don't exist
          try {
            // Try to create admin user directly - this will fail if User table doesn't exist
            const adminPassword = await bcrypt.hash("admin123", 12);
            
            await ctx.db.user.upsert({
              where: { email: "admin@pathdrive.com" },
              update: {},
              create: {
                email: "admin@pathdrive.com",
                name: "Administrator",
                password: adminPassword,
                role: "ADMIN",
                companyName: "PathDrive Inc.",
                companyDetails: "Network Infrastructure Provider",
                billingAddress: "123 Tech Street, San Francisco, CA 94105",
              },
            });

            await ctx.db.user.upsert({
              where: { email: "user@example.com" },
              update: {},
              create: {
                email: "user@example.com",
                name: "Sample User",
                password: await bcrypt.hash("user123", 12),
                role: "USER",
                companyName: "Example Corp",
                companyDetails: "Technology Company",
                billingAddress: "456 Business Ave, New York, NY 10001",
              },
            });

            return { message: "Database initialized successfully with users!" };
          } catch (createError: any) {
            // If user creation fails, tables probably don't exist
            console.error("Failed to create users, tables may not exist:", createError);
            
            return { 
              message: "Database tables do not exist. Please run 'npx prisma db push' in your database environment or contact admin to set up the database schema.", 
              error: createError.message 
            };
          }
        }
      } catch (error: any) {
        return { message: "Database connection error occurred. Please check DATABASE_URL configuration." };
      }
    }),

  checkDatabase: publicProcedure
    .query(async ({ ctx }) => {
      const results: any = {};
      
      // Check each table with proper PostgreSQL quoting
      const tables = [
        { name: 'User', quoted: '"User"' },
        { name: 'Location', quoted: '"Location"' },
        { name: 'Route', quoted: '"Route"' },
        { name: 'RouteCapacity', quoted: '"RouteCapacity"' },
        { name: 'Order', quoted: '"Order"' },
        { name: 'OrderItem', quoted: '"OrderItem"' }
      ];
      
      for (const table of tables) {
        try {
          const result = await ctx.db.$queryRawUnsafe(`SELECT count(*)::text FROM ${table.quoted}`);
          results[table.name] = { exists: true, count: result };
        } catch (error: any) {
          results[table.name] = { 
            exists: false, 
            error: error.message?.substring(0, 200) 
          };
        }
      }
      
      return results;
    }),
});