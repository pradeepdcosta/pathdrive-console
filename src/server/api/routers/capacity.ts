import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";

export const capacityRouter = createTRPCRouter({
  getByRoute: protectedProcedure
    .input(z.object({ routeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.routeCapacity.findMany({
        where: { routeId: input.routeId },
        orderBy: { capacity: "asc" },
      });
    }),

  create: adminProcedure
    .input(z.object({
      routeId: z.string(),
      capacity: z.enum(["TEN_G", "HUNDRED_G", "FOUR_HUNDRED_G"]),
      pricePerUnit: z.number().positive(),
      availableUnits: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.routeCapacity.create({
        data: input,
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      pricePerUnit: z.number().positive(),
      availableUnits: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.routeCapacity.update({
        where: { id },
        data,
      });
    }),

  updatePricing: adminProcedure
    .input(z.object({
      routeId: z.string(),
      capacities: z.array(z.object({
        capacity: z.enum(["TEN_G", "HUNDRED_G", "FOUR_HUNDRED_G"]),
        pricePerUnit: z.number().positive(),
        availableUnits: z.number().int().min(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      
      for (const capacityData of input.capacities) {
        const existing = await ctx.db.routeCapacity.findUnique({
          where: {
            routeId_capacity: {
              routeId: input.routeId,
              capacity: capacityData.capacity,
            },
          },
        });

        if (existing) {
          const updated = await ctx.db.routeCapacity.update({
            where: { id: existing.id },
            data: {
              pricePerUnit: capacityData.pricePerUnit,
              availableUnits: capacityData.availableUnits,
            },
          });
          results.push(updated);
        } else {
          const created = await ctx.db.routeCapacity.create({
            data: {
              routeId: input.routeId,
              capacity: capacityData.capacity,
              pricePerUnit: capacityData.pricePerUnit,
              availableUnits: capacityData.availableUnits,
            },
          });
          results.push(created);
        }
      }
      
      return results;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.routeCapacity.delete({
        where: { id: input.id },
      });
    }),
});