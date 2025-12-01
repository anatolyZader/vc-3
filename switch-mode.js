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

function updateVSCodeSettings(mode) {
  // Create .vscode directory if it doesn't exist
  if (!fs.existsSync(VSCODE_DIR)) {
    fs.mkdirSync(VSCODE_DIR, { recursive: true });
  }

  let settings = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (err) {
      console.warn('Warning: Could not parse existing settings.json, creating new one');
    }
  }

  if (mode === 'vibe') {
    // More autonomous settings
    settings['cursor.general.enableAutoUpdate'] = true;
    settings['cursor.ai.autoApply'] = true;
  } else if (mode === 'dev') {
    // More controlled settings
    settings['cursor.general.enableAutoUpdate'] = false;
    settings['cursor.ai.autoApply'] = false;
  }

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function switchToVibe() {
  console.log(`${colors.green}Switching to VIBE MODE (Autonomous)...${colors.reset}`);
  
  if (!fs.existsSync(VIBE_RULES)) {
    console.error(`Error: ${VIBE_RULES} not found`);
    process.exit(1);
  }
  
  fs.copyFileSync(VIBE_RULES, CURSORRULES_FILE);
  updateVSCodeSettings('vibe');
  
  console.log(`${colors.green}✓ Switched to VIBE MODE${colors.reset}`);
  console.log('Agent will now operate autonomously with minimal interruptions');
}

function switchToDev() {
  console.log(`${colors.green}Switching to DEV MODE (Collaborative)...${colors.reset}`);
  
  if (!fs.existsSync(DEV_RULES)) {
    console.error(`Error: ${DEV_RULES} not found`);
    process.exit(1);
  }
  
  fs.copyFileSync(DEV_RULES, CURSORRULES_FILE);
  updateVSCodeSettings('dev');
  
  console.log(`${colors.green}✓ Switched to DEV MODE${colors.reset}`);
  console.log('Agent will now work collaboratively with frequent check-ins');
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

