import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample locations
  const locations = await Promise.all([
    // US East Coast
    prisma.location.create({
      data: {
        name: "NYC01 Data Center",
        type: "DC",
        region: "North America",
        city: "New York",
        latitude: 40.7128,
        longitude: -74.0060,
      },
    }),
    prisma.location.create({
      data: {
        name: "MIA01 Cable Landing Station",
        type: "CLS",
        region: "North America",
        city: "Miami",
        latitude: 25.7617,
        longitude: -80.1918,
      },
    }),
    prisma.location.create({
      data: {
        name: "ATL01 Point of Presence",
        type: "POP",
        region: "North America",
        city: "Atlanta",
        latitude: 33.7490,
        longitude: -84.3880,
      },
    }),
    
    // US West Coast
    prisma.location.create({
      data: {
        name: "LAX01 Data Center",
        type: "DC",
        region: "North America",
        city: "Los Angeles",
        latitude: 34.0522,
        longitude: -118.2437,
      },
    }),
    prisma.location.create({
      data: {
        name: "SFO01 Cable Landing Station",
        type: "CLS",
        region: "North America",
        city: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
      },
    }),
    
    // Europe
    prisma.location.create({
      data: {
        name: "LON01 Data Center",
        type: "DC",
        region: "Europe",
        city: "London",
        latitude: 51.5074,
        longitude: -0.1278,
      },
    }),
    prisma.location.create({
      data: {
        name: "AMS01 Point of Presence",
        type: "POP",
        region: "Europe",
        city: "Amsterdam",
        latitude: 52.3676,
        longitude: 4.9041,
      },
    }),
    prisma.location.create({
      data: {
        name: "FRA01 Data Center",
        type: "DC",
        region: "Europe",
        city: "Frankfurt",
        latitude: 50.1109,
        longitude: 8.6821,
      },
    }),
    
    // Asia Pacific
    prisma.location.create({
      data: {
        name: "TOK01 Cable Landing Station",
        type: "CLS",
        region: "Asia Pacific",
        city: "Tokyo",
        latitude: 35.6762,
        longitude: 139.6503,
      },
    }),
    prisma.location.create({
      data: {
        name: "SIN01 Data Center",
        type: "DC",
        region: "Asia Pacific",
        city: "Singapore",
        latitude: 1.3521,
        longitude: 103.8198,
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations`);

  // Create sample routes
  const routes = await Promise.all([
    // Trans-Atlantic routes
    prisma.route.create({
      data: {
        name: "NYC-LON-01",
        aEndId: locations[0].id, // NYC01
        bEndId: locations[5].id, // LON01
        distance: 5585.3,
        isVisible: true,
      },
    }),
    prisma.route.create({
      data: {
        name: "MIA-LON-01",
        aEndId: locations[1].id, // MIA01
        bEndId: locations[5].id, // LON01
        distance: 7141.8,
        isVisible: true,
      },
    }),
    
    // Trans-Pacific routes
    prisma.route.create({
      data: {
        name: "SFO-TOK-01",
        aEndId: locations[4].id, // SFO01
        bEndId: locations[8].id, // TOK01
        distance: 8278.3,
        isVisible: true,
      },
    }),
    prisma.route.create({
      data: {
        name: "LAX-SIN-01",
        aEndId: locations[3].id, // LAX01
        bEndId: locations[9].id, // SIN01
        distance: 17003.2,
        isVisible: true,
      },
    }),
    
    // Regional US routes
    prisma.route.create({
      data: {
        name: "NYC-ATL-01",
        aEndId: locations[0].id, // NYC01
        bEndId: locations[2].id, // ATL01
        distance: 1200.5,
        isVisible: true,
      },
    }),
    prisma.route.create({
      data: {
        name: "ATL-MIA-01",
        aEndId: locations[2].id, // ATL01
        bEndId: locations[1].id, // MIA01
        distance: 974.6,
        isVisible: true,
      },
    }),
    
    // European routes
    prisma.route.create({
      data: {
        name: "LON-AMS-01",
        aEndId: locations[5].id, // LON01
        bEndId: locations[6].id, // AMS01
        distance: 491.2,
        isVisible: true,
      },
    }),
    prisma.route.create({
      data: {
        name: "AMS-FRA-01",
        aEndId: locations[6].id, // AMS01
        bEndId: locations[7].id, // FRA01
        distance: 577.8,
        isVisible: true,
      },
    }),
    
    // Asia Pacific routes
    prisma.route.create({
      data: {
        name: "TOK-SIN-01",
        aEndId: locations[8].id, // TOK01
        bEndId: locations[9].id, // SIN01
        distance: 5315.7,
        isVisible: true,
      },
    }),
  ]);

  console.log(`✅ Created ${routes.length} routes`);

  // Create sample capacities for each route
  let capacityCount = 0;
  for (const route of routes) {
    const capacities = await Promise.all([
      prisma.routeCapacity.create({
        data: {
          routeId: route.id,
          capacity: "TEN_G",
          pricePerUnit: Math.floor(Math.random() * 5000) + 1000, // $1000-6000
          availableUnits: Math.floor(Math.random() * 20) + 5, // 5-25 units
        },
      }),
      prisma.routeCapacity.create({
        data: {
          routeId: route.id,
          capacity: "HUNDRED_G",
          pricePerUnit: Math.floor(Math.random() * 20000) + 8000, // $8000-28000
          availableUnits: Math.floor(Math.random() * 10) + 2, // 2-12 units
        },
      }),
      prisma.routeCapacity.create({
        data: {
          routeId: route.id,
          capacity: "FOUR_HUNDRED_G",
          pricePerUnit: Math.floor(Math.random() * 50000) + 25000, // $25000-75000
          availableUnits: Math.floor(Math.random() * 5) + 1, // 1-6 units
        },
      }),
    ]);
    capacityCount += capacities.length;
  }

  console.log(`✅ Created ${capacityCount} route capacities`);

  // Create an admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@pathdrive.com",
      name: "Administrator",
      role: "ADMIN",
      companyName: "PathDrive Inc.",
      companyDetails: "Network Infrastructure Provider",
      billingAddress: "123 Tech Street, San Francisco, CA 94105",
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create a sample regular user
  const sampleUser = await prisma.user.create({
    data: {
      email: "user@example.com",
      name: "Sample User",
      role: "USER",
      companyName: "Example Corp",
      companyDetails: "Technology Company",
      billingAddress: "456 Business Ave, New York, NY 10001",
    },
  });

  console.log(`✅ Created sample user: ${sampleUser.email}`);

  console.log("🌱 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });