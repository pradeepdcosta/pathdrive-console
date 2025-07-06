import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";

export const locationRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.location.findMany({
      where: { isActive: true },
      orderBy: [{ region: "asc" }, { city: "asc" }, { name: "asc" }],
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.location.findUnique({
        where: { id: input.id },
      });
    }),

  getRegions: protectedProcedure.query(async ({ ctx }) => {
    const regions = await ctx.db.location.findMany({
      where: { isActive: true },
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    });
    return regions.map(r => r.region);
  }),

  getCitiesByRegion: protectedProcedure
    .input(z.object({ region: z.string() }))
    .query(async ({ ctx, input }) => {
      const cities = await ctx.db.location.findMany({
        where: { region: input.region, isActive: true },
        select: { city: true },
        distinct: ["city"],
        orderBy: { city: "asc" },
      });
      return cities.map(c => c.city);
    }),

  getLocationsByCity: protectedProcedure
    .input(z.object({ region: z.string(), city: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.location.findMany({
        where: { 
          region: input.region, 
          city: input.city, 
          isActive: true 
        },
        orderBy: { name: "asc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["POP", "DC", "CLS"]),
      region: z.string(),
      city: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("Creating location with input:", input);
      console.log("User session:", ctx.session?.user);
      
      try {
        const location = await ctx.db.location.create({
          data: input,
        });
        console.log("Location created successfully:", location);
        return location;
      } catch (error) {
        console.error("Error creating location:", error);
        throw error;
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["POP", "DC", "CLS"]),
      region: z.string(),
      city: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.location.update({
        where: { id },
        data,
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.location.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});