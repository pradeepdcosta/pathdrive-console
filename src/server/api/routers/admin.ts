import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
  initializeDatabase: publicProcedure
    .mutation(async ({ ctx }) => {
      // Check if admin user already exists
      const existingAdmin = await ctx.db.user.findUnique({
        where: { email: "admin@pathdrive.com" },
      });

      if (existingAdmin) {
        return { message: "Database already initialized" };
      }

      // Create admin user
      const adminPassword = await bcrypt.hash("admin123", 12);
      await ctx.db.user.create({
        data: {
          email: "admin@pathdrive.com",
          name: "Administrator",
          password: adminPassword,
          role: "ADMIN",
          companyName: "PathDrive Inc.",
          companyDetails: "Network Infrastructure Provider",
          billingAddress: "123 Tech Street, San Francisco, CA 94105",
        },
      });

      // Create sample user
      const userPassword = await bcrypt.hash("user123", 12);
      await ctx.db.user.create({
        data: {
          email: "user@example.com",
          name: "Sample User",
          password: userPassword,
          role: "USER",
          companyName: "Example Corp",
          companyDetails: "Technology Company",
          billingAddress: "456 Business Ave, New York, NY 10001",
        },
      });

      return { message: "Database initialized successfully" };
    }),
});