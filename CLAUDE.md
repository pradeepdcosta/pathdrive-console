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

## Production Deployment Guide - Supabase + Vercel

This section documents the complete production deployment process that was successfully implemented on 2025-01-02.

### Overview
PathDriveConsole was successfully deployed using:
- **Frontend/Backend**: Vercel (serverless)
- **Database**: Supabase (PostgreSQL with connection pooling)
- **Authentication**: NextAuth.js with credential provider
- **Schema Management**: Prisma with custom migration setup

### Key Challenges Encountered & Solutions

#### 1. Database Connection Configuration
**Problem**: Initial deployment failed due to incorrect Supabase connection string.
- Using direct connection: `db.xxx.supabase.co:5432` (failed in serverless)
- **Solution**: Switch to connection pooling URL: `aws-0-[region].pooler.supabase.com:6543`

**Correct Vercel Environment Variables:**
```
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=[generated-secret]
NEXTAUTH_URL=https://your-app.vercel.app
```

#### 2. Schema Creation in Production
**Problem**: `prisma migrate deploy` failed during Vercel build due to database connectivity restrictions.
- **Initial Approach**: Include migration in build process ❌
- **Solution**: Separate schema creation from build process ✅

**Implementation:**
1. Remove database operations from build script
2. Create custom schema setup API endpoint (`/api/admin/setupSchema`)
3. Handle schema creation via web interface after deployment

#### 3. PostgreSQL Prepared Statement Conflicts
**Problem**: "prepared statement 's8' already exists" errors in serverless environment.
- Occurred during both schema setup and authentication
- Common issue with PostgreSQL connection pooling and serverless functions

**Solution**: Implemented fallback query mechanism:
```typescript
// Authentication with prepared statement handling
try {
  user = await db.user.findUnique({ where: { email } });
} catch (dbError) {
  // Fallback to raw SQL to avoid prepared statement conflicts
  const result = await db.$queryRaw`
    SELECT id, email, name, password, role 
    FROM "User" 
    WHERE email = ${email}
    LIMIT 1
  `;
  user = Array.isArray(result) && result.length > 0 ? result[0] : null;
}
```

#### 4. Database Initialization with Existing Data
**Problem**: Previous deployment attempts left orphaned user data with incorrect passwords.
- **Solution**: Update existing users instead of skipping initialization:

```typescript
// Update existing admin user with correct password
if (existingAdmin) {
  const adminPassword = await bcrypt.hash("admin123", 12);
  await ctx.db.user.update({
    where: { email: "admin@pathdrive.com" },
    data: { password: adminPassword, role: "ADMIN" }
  });
}
```

### Production Deployment Steps

#### Step 1: Environment Setup
1. **Create Supabase Project**
   - Note the connection pooling URL (port 6543)
   - Copy PostgreSQL connection string

2. **Configure Vercel Environment Variables**
   ```
   DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

3. **Deploy to Vercel**
   - Push code to GitHub
   - Connect repository to Vercel
   - Vercel auto-deploys on push

#### Step 2: Database Setup
1. **Navigate to**: `https://your-app.vercel.app/admin/init-db`

2. **Step 1: Setup Database Schema**
   - Click "Step 1: Setup Database Schema"
   - Wait for green success message
   - This creates all tables, indexes, and constraints

3. **Step 2: Initialize Sample Data**
   - Click "Step 2: Initialize Database with Sample Data"
   - Creates admin and sample users with correct passwords

#### Step 3: Verification
1. **Test Login**: admin@pathdrive.com / admin123
2. **Check Users**: Visit `/admin/users` to see created accounts
3. **Verify Database**: Check Supabase Table Editor for data

### Files Created/Modified for Production

#### Migration Files
- `prisma/migrations/20250102000000_init/migration.sql` - Complete schema
- `prisma/migrations/migration_lock.toml` - PostgreSQL provider lock

#### API Endpoints
- `setupSchema` in `admin.ts` - Creates database schema via SQL
- `initializeDatabase` in `admin.ts` - Creates/updates users
- `listUsers` in `admin.ts` - Debug endpoint for user verification

#### Pages
- `/admin/init-db` - Web interface for database setup
- `/admin/users` - User debugging and verification

#### Authentication
- Modified `auth/config.ts` with prepared statement error handling
- Added fallback raw SQL queries for reliability

### Monitoring & Debugging

#### Vercel Logs
- Access via: Vercel Dashboard → Project → Logs tab
- Shows real-time function execution and errors
- Essential for debugging authentication and database issues

#### Supabase Monitoring
- Table Editor: Visual inspection of database data
- SQL Editor: Manual queries for debugging
- Logs: Database query performance and errors

### Security Considerations
- All passwords hashed with bcryptjs (12 rounds)
- Environment variables properly configured in Vercel
- Database connection uses connection pooling for security
- No sensitive data exposed in client-side code

### Performance Optimizations
- Connection pooling prevents database connection exhaustion
- Prepared statement fallbacks ensure reliability
- Serverless functions auto-scale with demand
- CDN delivery via Vercel edge network

### Troubleshooting Common Issues

#### "Invalid email or password" but users exist
- Check Vercel logs for authentication errors
- Verify prepared statement conflicts aren't occurring
- Ensure password was updated correctly in Step 2

#### Schema setup fails
- Verify DATABASE_URL uses connection pooling (port 6543)
- Check Supabase project is running
- Ensure sufficient database permissions

#### Build failures
- Remove database operations from build scripts
- Verify environment variables are set correctly
- Check for syntax errors in migration files

This deployment approach ensures reliable, scalable production hosting while handling the complexities of serverless PostgreSQL connections.