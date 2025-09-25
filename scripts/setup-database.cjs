#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🗄️  Database Setup Script');
console.log('========================\n');

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (error) {
  // Dotenv not available, environment variables should be set directly
  console.log('💡 Note: dotenv not available, using system environment variables');
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.log('💡 Make sure you have run the initialization script first');
  process.exit(1);
}

console.log('✅ Database URL loaded from environment');

// Test database connection
console.log('\n🔌 Testing database connection...');
try {
  // Try to determine database type and use appropriate driver
  const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                         process.env.DATABASE_URL.includes('neon.database') ||
                         process.env.DATABASE_URL.includes('@ep-');
  
  let pool;
  console.log(`🔍 Detected database type: ${isNeonDatabase ? 'Neon' : 'Standard PostgreSQL'}`);
  
  // For deployment environments, always use standard pg driver for reliability
  // The Neon serverless driver can have WebSocket issues in some environments
  console.log('🔧 Using standard PostgreSQL driver for maximum compatibility...');
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Test the connection
  const testConnection = async () => {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  };
  
  // Run the test synchronously
  (async () => {
    const connected = await testConnection();
    if (!connected) {
      console.log('💡 Please check your database configuration and ensure:');
      console.log('   - Database server is running');
      console.log('   - Connection URL is correct');
      console.log('   - Database exists');
      console.log('   - User has proper permissions');
      process.exit(1);
    }
    
    // Push database schema
    console.log('\n📋 Creating database schema...');
    console.log('💡 Note: This will update your database schema to match the code');
    try {
      // Try with verbose flag to avoid interactive prompts
      execSync('npx drizzle-kit push --verbose', { 
        stdio: 'inherit',
        input: '+\n' // Select "create column" option for company_revenue
      });
      console.log('✅ Database schema created successfully');
    } catch (error) {
      console.error('❌ Standard push failed, trying alternative approach...');
      try {
        // Use generate + migrate approach for better control
        console.log('🔧 Generating migration...');
        execSync('npx drizzle-kit generate', { stdio: 'inherit' });
        console.log('🔧 Applying migration...');
        execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
        console.log('✅ Database schema updated successfully');
      } catch (migrateError) {
        console.error('❌ Migration approach failed, trying force push...');
        try {
          execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
          console.log('✅ Database schema created successfully (force)');
        } catch (forceError) {
          console.error('❌ All schema update attempts failed.');
          console.log('💡 Manual intervention required. Please run:');
          console.log('   npx drizzle-kit push');
          console.log('   Select "create column" for company_revenue');
          process.exit(1);
        }
      }
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('📊 Your database now includes:');
    console.log('   - users table (registration data)');
    console.log('   - invitation_codes table (viral invitation system)');
    console.log('   - waitlist table (waitlist management)');
    console.log('   - sessions table (user authentication)');
    console.log('   - email_logs table (email audit trail)');
    
    await pool.end();
  })();
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}