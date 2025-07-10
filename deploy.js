#!/usr/bin/env node

/**
 * Simple deployment script to ensure consistent builds
 * This helps prevent local vs production differences
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting deployment process...');

try {
  // Clean install to ensure consistent dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm ci', { stdio: 'inherit', cwd: './frontend' });
  
  // Build with consistent environment
  console.log('🔨 Building for production...');
  execSync('npm run build', { 
    stdio: 'inherit', 
    cwd: './frontend',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      GENERATE_SOURCEMAP: 'false'
    }
  });
  
  console.log('✅ Build completed successfully!');
  console.log('📤 Ready for deployment to Netlify');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
