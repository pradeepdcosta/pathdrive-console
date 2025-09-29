# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbo mode
- `npm run build` - Production build with Prisma client generation
- `npm run start` - Start production server
- `npm run preview` - Build and start production server locally

### Database Operations
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Deploy migrations (production)
- `npm run db:seed` - Populate database with sample data
- `npm run db:studio` - Open Prisma Studio for visual database management

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run typecheck` - Run TypeScript type checking
- `npm run check` - Run both lint and typecheck
- `npm run format:check` - Check code formatting with Prettier
- `npm run format:write` - Format code with Prettier

### Testing Database Setup
- Run `npm run db:seed` to create sample locations, routes, and admin users
- Use admin credentials: admin@pathdrive.com / admin123
- Use regular user: user@example.com / user123

## Architecture Overview

### T3 Stack Application Structure
PathDriveConsole uses the T3 Stack pattern with:
- **Next.js 15** (hybrid App/Pages router)
- **tRPC** for type-safe APIs
- **Prisma** for database ORM
- **NextAuth.js** for authentication
- **TypeScript** throughout

### API Layer Organization (tRPC)

**Three-tier Authorization System:**
- `publicProcedure` - Unauthenticated access
- `protectedProcedure` - Authenticated users only  
- `adminProcedure` - Admin role required

**Domain-based Router Structure:**
```
src/server/api/routers/
├── location.ts    # Network locations (POPs, DCs, CLS)
├── route.ts       # Network routes between locations
├── capacity.ts    # Route capacity management
├── order.ts       # Order processing and management
├── auth.ts        # Authentication procedures
├── admin.ts       # Admin-only operations
└── post.ts        # Legacy demo routes
```

**Context Available in All Procedures:**
- `ctx.db` - Prisma database client
- `ctx.session` - User session (null for public procedures)
- `ctx.session.user.role` - USER or ADMIN (in protected/admin procedures)

### Database Schema Key Entities

**Core Business Models:**
- `Location` - Network endpoints with geographic data
- `Route` - Connections between two locations
- `RouteCapacity` - Available bandwidth (10G/100G/400G) and pricing
- `Order` & `OrderItem` - Customer orders with inventory management
- `User` - Authentication with role-based access (USER/ADMIN)

**Important Relationships:**
- Route connects exactly two Locations (aEnd/bEnd)
- Each Route has multiple RouteCapacity entries for different bandwidth tiers
- Orders contain multiple OrderItems, each referencing a RouteCapacity
- RouteCapacity.availableUnits decrements when orders are confirmed

### Authentication & Authorization Patterns

**NextAuth.js Configuration:**
- Credential provider with bcrypt password hashing
- Optional Discord OAuth
- JWT session strategy with custom user properties

**Authorization Checks:**
```typescript
// Users can only access their own orders (except admins)
if (order.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

### Component Architecture

**Layout Structure:**
- `Layout.tsx` - Main app layout with role-based navigation
- `admin/AdminLayout.tsx` - Admin-specific layout wrapper

**Page Organization:**
- `/src/pages/` - Main application pages (Pages Router)
- `/src/pages/admin/` - Admin dashboard pages
- `/src/app/api/` - API routes (App Router for NextAuth)

## Development Patterns

### Adding New API Endpoints
1. Choose appropriate procedure type (public/protected/admin)
2. Add to existing domain router or create new router
3. Include router in `src/server/api/root.ts`
4. Use Zod for input validation

### Database Schema Changes
1. Update `prisma/schema.prisma`
2. Run `npm run db:push` for development
3. For production, use `npx prisma migrate dev` to create migrations

### Working with Orders
- Always check inventory (RouteCapacity.availableUnits) before confirming orders
- Use database transactions for order creation to ensure inventory consistency
- Follow order status workflow: PENDING → CONFIRMED → PROCESSING → ACTIVE

### Role-Based Access Control
- Use `adminProcedure` for admin-only operations
- Check user ownership for user-specific data
- Admin users have access to all data regardless of ownership

### Type Safety Best Practices
- All API calls use tRPC for end-to-end type safety
- Database operations use Prisma for type-safe queries
- Use `include` parameter for efficient relationship loading
- Leverage Zod schemas for runtime validation

### Environment Setup
- Copy `.env.example` to `.env` and configure
- `DATABASE_URL` required for database connection
- `NEXTAUTH_SECRET` required for JWT signing
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` optional for map features

### Production Deployment Notes
- Database initialization via `/admin/init-db` endpoint (one-time setup)
- Prisma client auto-generates during build process
- Use PostgreSQL for production (configured in schema.prisma)