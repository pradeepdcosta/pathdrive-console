import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
  getUserOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.order.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        items: {
          include: {
            route: {
              include: {
                aEnd: true,
                bEnd: true,
              },
            },
            routeCapacity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          items: {
            include: {
              route: {
                include: {
                  aEnd: true,
                  bEnd: true,
                },
              },
              routeCapacity: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }

      return order;
    }),

  create: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        routeId: z.string(),
        routeCapacityId: z.string(),
        quantity: z.number().int().positive(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      let totalAmount = 0;
      const orderItems = [];

      for (const item of input.items) {
        const routeCapacity = await ctx.db.routeCapacity.findUnique({
          where: { id: item.routeCapacityId },
        });

        if (!routeCapacity) {
          throw new Error(`Route capacity not found: ${item.routeCapacityId}`);
        }

        if (routeCapacity.availableUnits < item.quantity) {
          throw new Error(`Insufficient capacity available for route capacity: ${item.routeCapacityId}`);
        }

        const itemTotal = routeCapacity.pricePerUnit * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          routeId: item.routeId,
          routeCapacityId: item.routeCapacityId,
          quantity: item.quantity,
          unitPrice: routeCapacity.pricePerUnit,
          totalPrice: itemTotal,
        });
      }

      const order = await ctx.db.order.create({
        data: {
          userId: ctx.session.user.id,
          totalAmount,
          status: "PENDING",
          paymentStatus: "PENDING",
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              route: {
                include: {
                  aEnd: true,
                  bEnd: true,
                },
              },
              routeCapacity: true,
            },
          },
        },
      });

      return order;
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "ACTIVE", "CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.order.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  updatePaymentStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]),
      paymentIntentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.id },
        data: {
          paymentStatus: input.paymentStatus,
          paymentIntentId: input.paymentIntentId,
          ...(input.paymentStatus === "COMPLETED" && { status: "CONFIRMED" }),
        },
      });

      if (input.paymentStatus === "COMPLETED") {
        const orderWithItems = await ctx.db.order.findUnique({
          where: { id: input.id },
          include: { items: true },
        });
        
        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            await ctx.db.routeCapacity.update({
              where: { id: item.routeCapacityId },
              data: {
                availableUnits: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }
      }

      return updatedOrder;
    }),

  requestCancellation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      if (order.status === "CANCELLED") {
        throw new Error("Order is already cancelled");
      }

      return ctx.db.order.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  getAllOrders: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.order.findMany({
      include: {
        user: true,
        items: {
          include: {
            route: {
              include: {
                aEnd: true,
                bEnd: true,
              },
            },
            routeCapacity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  updateOrder: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      items: z.array(z.object({
        routeId: z.string(),
        routeCapacityId: z.string(),
        quantity: z.number().int().positive(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if order exists and belongs to user
      const existingOrder = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      if (existingOrder.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      if (existingOrder.status !== "PENDING") {
        throw new Error("Only pending orders can be modified");
      }

      // Calculate new total amount
      let totalAmount = 0;
      const orderItems = [];

      for (const item of input.items) {
        const routeCapacity = await ctx.db.routeCapacity.findUnique({
          where: { id: item.routeCapacityId },
        });

        if (!routeCapacity) {
          throw new Error(`Route capacity not found: ${item.routeCapacityId}`);
        }

        if (routeCapacity.availableUnits < item.quantity) {
          throw new Error(`Insufficient capacity available for route capacity: ${item.routeCapacityId}`);
        }

        const itemTotal = routeCapacity.pricePerUnit * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          routeId: item.routeId,
          routeCapacityId: item.routeCapacityId,
          quantity: item.quantity,
          unitPrice: routeCapacity.pricePerUnit,
          totalPrice: itemTotal,
        });
      }

      // Delete existing order items and create new ones
      await ctx.db.orderItem.deleteMany({
        where: { orderId: input.orderId },
      });

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          totalAmount,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              route: {
                include: {
                  aEnd: true,
                  bEnd: true,
                },
              },
              routeCapacity: true,
            },
          },
        },
      });

      return updatedOrder;
    }),
});