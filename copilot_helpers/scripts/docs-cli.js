#!/usr/bin/env node
'use strict';

/**
 * Convenience script to run the Docs CLI from the backend root directory
 * 
 * This script allows you to run the docs documentation generator from
 * the backend root without navigating to the specific module directory.
 * 
 * Usage from backend root:
 *   node docs-cli.js [options]
 *   npm run docs:generate [-- options]
 */

const path = require('path');
const { spawn } = require('child_process');

// Load environment variables from .env files
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Backend root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Project root

// Path to the actual CLI script
const cliScriptPath = path.join(__dirname, 'business_modules', 'docs', 'input', 'docsCli.js');

// Forward all arguments to the actual CLI script
const args = process.argv.slice(2);

console.log('🔗 Running Docs CLI from backend root...');
console.log(`📂 CLI Script: ${cliScriptPath}`);

// Spawn the CLI process
const cliProcess = spawn('node', [cliScriptPath, ...args], {
  stdio: 'inherit', // Forward all stdio to the parent process
  cwd: __dirname   // Run from backend directory
});

// Forward exit codes
cliProcess.on('exit', (code) => {
  process.exit(code);
});

// Handle errors
cliProcess.on('error', (error) => {
  console.error('❌ Failed to start Docs CLI:', error.message);
  process.exit(1);
});
