#!/usr/bin/env node

/**
 * Cursor Agent Mode Switcher (Node.js version)
 * Switches between VIBE mode (autonomous) and DEV mode (collaborative)
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/home/eventstorm1/vc-3';
const CURSORRULES_FILE = path.join(PROJECT_ROOT, '.cursorrules');
const VIBE_RULES = path.join(PROJECT_ROOT, '.cursorrules.vibe');
const DEV_RULES = path.join(PROJECT_ROOT, '.cursorrules.dev');
const VSCODE_DIR = path.join(PROJECT_ROOT, '.vscode');
const SETTINGS_FILE = path.join(VSCODE_DIR, 'settings.json');
const VIBE_SETTINGS = path.join(VSCODE_DIR, 'settings.vibe.json');
const DEV_SETTINGS = path.join(VSCODE_DIR, 'settings.dev.json');

// Colors
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function showCurrentMode() {
  if (fs.existsSync(CURSORRULES_FILE)) {
    const content = fs.readFileSync(CURSORRULES_FILE, 'utf8');
    if (content.includes('VIBE MODE')) {
      console.log(`${colors.blue}Current mode: VIBE (Autonomous)${colors.reset}`);
    } else if (content.includes('DEV MODE')) {
      console.log(`${colors.blue}Current mode: DEV (Collaborative)${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Current mode: Unknown (custom .cursorrules)${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}No mode set (no .cursorrules file)${colors.reset}`);
  }
}

function copySettings(sourceFile, label) {
  // Create .vscode directory if it doesn't exist
  if (!fs.existsSync(VSCODE_DIR)) {
    fs.mkdirSync(VSCODE_DIR, { recursive: true });
  }

  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, SETTINGS_FILE);
    console.log(`  ✓ Applied ${label} VSCode/Cursor settings`);
    return true;
  } else {
    console.log(`${colors.yellow}  ⚠ Warning: ${sourceFile} not found${colors.reset}`);
    return false;
  }
}

function switchToVibe() {
  console.log(`${colors.green}Switching to VIBE MODE (Autonomous)...${colors.reset}`);
  
  // Copy cursorrules
  if (fs.existsSync(VIBE_RULES)) {
    fs.copyFileSync(VIBE_RULES, CURSORRULES_FILE);
    console.log('  ✓ Applied VIBE .cursorrules');
  } else {
    console.log(`${colors.yellow}  ⚠ Warning: ${VIBE_RULES} not found${colors.reset}`);
  }
  
  // Copy settings
  copySettings(VIBE_SETTINGS, 'VIBE');
  
  console.log('');
  console.log(`${colors.green}✓ Switched to VIBE MODE${colors.reset}`);
  console.log('  → Agent operates autonomously');
  console.log('  → Minimal interruptions and prompts');
  console.log('  → Auto-apply suggestions enabled');
  console.log('  → Max context and long-running tasks');
}

function switchToDev() {
  console.log(`${colors.green}Switching to DEV MODE (Collaborative)...${colors.reset}`);
  
  // Copy cursorrules
  if (fs.existsSync(DEV_RULES)) {
    fs.copyFileSync(DEV_RULES, CURSORRULES_FILE);
    console.log('  ✓ Applied DEV .cursorrules');
  } else {
    console.log(`${colors.yellow}  ⚠ Warning: ${DEV_RULES} not found${colors.reset}`);
  }
  
  // Copy settings
  copySettings(DEV_SETTINGS, 'DEV');
  
  console.log('');
  console.log(`${colors.green}✓ Switched to DEV MODE${colors.reset}`);
  console.log('  → Agent works collaboratively');
  console.log('  → Frequent approvals required');
  console.log('  → Detailed explanations enabled');
  console.log('  → Educational mode active');
}

function showHelp() {
  console.log('Cursor Agent Mode Switcher');
  console.log('');
  console.log('Usage: node switch-mode.js [mode]');
  console.log('   or: npm run switch-mode [mode]');
  console.log('');
  console.log('Modes:');
  console.log('  vibe    - Switch to VIBE mode (autonomous, minimal interruptions)');
  console.log('  dev     - Switch to DEV mode (collaborative, frequent approvals)');
  console.log('  status  - Show current mode');
  console.log('  help    - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node switch-mode.js vibe    # Switch to autonomous mode');
  console.log('  node switch-mode.js dev     # Switch to collaborative mode');
  console.log('  node switch-mode.js status  # Check current mode');
}

// Main script logic
const mode = process.argv[2];

switch (mode) {
  case 'vibe':
    switchToVibe();
    break;
  case 'dev':
    switchToDev();
    break;
  case 'status':
    showCurrentMode();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log(`${colors.yellow}No mode specified${colors.reset}`);
    console.log('');
    showCurrentMode();
    console.log('');
    showHelp();
    process.exit(1);
}

