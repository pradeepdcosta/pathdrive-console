import { postRouter } from "~/server/api/routers/post";
import { locationRouter } from "~/server/api/routers/location";
import { routeRouter } from "~/server/api/routers/route";
import { capacityRouter } from "~/server/api/routers/capacity";
import { orderRouter } from "~/server/api/routers/order";
import { authRouter } from "~/server/api/routers/auth";
import { adminRouter } from "~/server/api/routers/admin";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  location: locationRouter,
  route: routeRouter,
  capacity: capacityRouter,
  order: orderRouter,
  auth: authRouter,
  admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
