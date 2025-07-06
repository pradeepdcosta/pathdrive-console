import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";

export const routeRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.route.findMany({
      where: { isActive: true, isVisible: true },
      include: {
        aEnd: true,
        bEnd: true,
        capacities: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  getFilteredRoutes: protectedProcedure
    .input(z.object({
      aEndRegion: z.string().optional(),
      aEndCity: z.string().optional(),
      aEndId: z.string().optional(),
      bEndRegion: z.string().optional(),
      bEndCity: z.string().optional(),
      bEndId: z.string().optional(),
      capacity: z.enum(["TEN_G", "HUNDRED_G", "FOUR_HUNDRED_G"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const routes = await ctx.db.route.findMany({
        where: {
          isActive: true,
          isVisible: true,
          ...(input.aEndRegion && {
            aEnd: { region: input.aEndRegion }
          }),
          ...(input.aEndCity && {
            aEnd: { city: input.aEndCity }
          }),
          ...(input.aEndId && {
            aEndId: input.aEndId
          }),
          ...(input.bEndRegion && {
            bEnd: { region: input.bEndRegion }
          }),
          ...(input.bEndCity && {
            bEnd: { city: input.bEndCity }
          }),
          ...(input.bEndId && {
            bEndId: input.bEndId
          }),
          ...(input.capacity && {
            capacities: {
              some: {
                capacity: input.capacity,
                availableUnits: { gt: 0 }
              }
            }
          }),
        },
        include: {
          aEnd: true,
          bEnd: true,
          capacities: {
            where: {
              ...(input.capacity && { capacity: input.capacity }),
              availableUnits: { gt: 0 }
            }
          },
        },
        orderBy: { name: "asc" },
      });
      
      return routes.filter(route => route.capacities.length > 0);
    }),

  getAdminRoutes: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.route.findMany({
      where: { isActive: true },
      include: {
        aEnd: true,
        bEnd: true,
        capacities: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string(),
      aEndId: z.string(),
      bEndId: z.string(),
      distance: z.number().optional(),
      isVisible: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.route.create({
        data: input,
        include: {
          aEnd: true,
          bEnd: true,
          capacities: true,
        },
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      aEndId: z.string(),
      bEndId: z.string(),
      distance: z.number().optional(),
      isVisible: z.boolean(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.route.update({
        where: { id },
        data,
        include: {
          aEnd: true,
          bEnd: true,
          capacities: true,
        },
      });
    }),

  updateVisibility: adminProcedure
    .input(z.object({
      id: z.string(),
      isVisible: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.route.update({
        where: { id: input.id },
        data: { isVisible: input.isVisible },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.route.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});