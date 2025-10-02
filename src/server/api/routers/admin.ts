import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { execSync } from "child_process";

// Simple function to generate CUID-like IDs
function generateId(): string {
  return 'c' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const adminRouter = createTRPCRouter({
  setupSchema: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Run prisma db push to create tables
        console.log("Running prisma db push to create schema...");
        execSync("npx prisma db push --accept-data-loss", { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        return { message: "Database schema created successfully!" };
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