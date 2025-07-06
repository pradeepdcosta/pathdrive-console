# PathDrive Console - Dedicated Ethernet Pricing Platform

A comprehensive web application for managing and ordering dedicated ethernet services with dynamic pricing, route management, and administrative controls.

## Features

### User Features
- **Route Search & Filtering**: Hierarchical filtering by region → city → location → endpoint type
- **Real-time Pricing**: View current pricing for 10G, 100G, and 400G capacity options
- **Interactive Ordering**: Complete order flow with terms acceptance and payment processing
- **Order Management**: View order history, track status, and request cancellations
- **Responsive Design**: Optimized for desktop and mobile devices

### Admin Features
- **Location Management**: Create and manage POPs, Data Centers, and Cable Landing Stations
- **Route Management**: Define routes between locations and control visibility
- **Pricing Controls**: Set pricing and availability for different capacity tiers
- **Order Oversight**: Monitor all orders and manage cancellation requests

### Technical Features
- **Role-based Authentication**: Separate admin and user access levels
- **Type-safe APIs**: Full TypeScript coverage with tRPC
- **Real-time Updates**: Automatic data synchronization
- **Secure Payments**: Payment processing simulation
- **Database Integration**: SQLite with Prisma ORM

## Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **Authentication**: NextAuth.js with credential and OAuth providers
- **Database**: SQLite with Prisma ORM
- **API Layer**: tRPC for type-safe client-server communication
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Query (via tRPC)
- **Validation**: Zod for runtime type checking

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd PathDriveConsole
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```
   DATABASE_URL="file:./db.sqlite"
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Initialize the database**:
   ```bash
   npm run db:push
   ```

5. **Seed with sample data**:
   ```bash
   npm run db:seed
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Sample Credentials

After seeding, you can log in with these sample accounts:

- **Admin User**: admin@pathdrive.com
- **Regular User**: user@example.com

*Note: The demo uses a simplified authentication system. In production, implement proper password hashing and security measures.*

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── admin/          # Admin-specific components
│   ├── Layout.tsx      # Main application layout
│   ├── RouteSelector.tsx # Route filtering interface
│   └── RouteResults.tsx  # Search results display
├── pages/              # Next.js pages and API routes
│   ├── admin/          # Admin panel pages
│   ├── api/            # API endpoints
│   ├── order/          # Order flow pages
│   ├── dashboard.tsx   # User dashboard
│   └── index.tsx       # Homepage
├── server/             # Backend logic
│   ├── api/            # tRPC routers and procedures
│   ├── auth/           # Authentication configuration
│   └── db.ts           # Database connection
├── scripts/            # Utility scripts
│   └── seed.ts         # Database seeding
└── styles/             # Global styles
```

## Database Schema

The application uses a relational database with the following main entities:

- **Users**: Authentication and profile information
- **Locations**: Network endpoints (POPs, DCs, CLS)
- **Routes**: Connections between two locations
- **RouteCapacities**: Available bandwidth and pricing
- **Orders**: Customer orders and order items

## API Endpoints

The application provides tRPC procedures for:

- **Location management**: CRUD operations for network locations
- **Route management**: Route creation, visibility controls
- **Capacity management**: Pricing and availability updates
- **Order processing**: Order creation, payment, and status management

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Populate database with sample data
- `npm run db:studio` - Open Prisma Studio for database management
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint

## Features in Detail

### Hierarchical Location Filtering
Users can filter routes using a cascading selection system:
1. Select origin and destination regions
2. Choose specific cities within those regions
3. Pick exact locations within those cities
4. View available routes and pricing

### Dynamic Pricing System
- Real-time pricing based on current capacity availability
- Three tier system: 10G, 100G, 400G
- Automatic unit availability tracking
- Admin controls for price adjustments

### Order Management
- Complete order workflow with terms acceptance
- Payment simulation with order confirmation
- Order history and status tracking
- Cancellation request system

### Admin Dashboard
- Location management with geographic coordinates
- Route visibility controls
- Pricing and capacity management
- Order oversight and administration

## Future Enhancements

- **Google Maps Integration**: Visual route display
- **Email Notifications**: Automated order confirmations
- **Advanced Analytics**: Usage and revenue reporting
- **API Integration**: External payment processing
- **Multi-currency Support**: International pricing
- **Bandwidth Monitoring**: Real-time utilization tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
