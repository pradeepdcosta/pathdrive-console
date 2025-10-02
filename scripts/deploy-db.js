#!/usr/bin/env node

/**
 * Database deployment script for production environments
 * This script runs database migrations after the application is deployed
 */

import { execSync } from 'child_process';

async function deployDatabase() {
  try {
    console.log('🚀 Starting database deployment...');
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set');
      process.exit(1);
    }
    
    console.log('📋 Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: process.env 
    });
    
    console.log('✅ Database deployment completed successfully!');
    console.log('🔗 You can now access /admin/init-db to initialize sample data');
    
  } catch (error) {
    console.error('❌ Database deployment failed:', error.message);
    console.log('💡 You can manually run migrations using the /admin/init-db endpoint');
    process.exit(1);
  }
}

deployDatabase();