#!/bin/bash

# Debug Cloud Run Deployment Script
# This script helps debug deployment issues locally before pushing to GitHub

set -e  # Exit on any error

echo "🔍 EventStorm Cloud Run Deployment Debug Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    log_error "Please run this script from the project root directory (where backend/ folder exists)"
    exit 1
fi

cd backend

log_info "Starting deployment verification..."

echo
echo "1️⃣ CHECKING CRITICAL FILES"
echo "=========================="

check_file() {
    if [ -f "$1" ]; then
        log_success "$1 exists"
        return 0
    else
        log_error "$1 is missing"
        return 1
    fi
}

# Check critical files
check_file "package.json" || exit 1
check_file "server.js" || exit 1
check_file "app.js" || exit 1

echo
echo "2️⃣ ANALYZING PACKAGE.JSON"
echo "========================"

log_info "Package details:"
node -e "
const pkg = require('./package.json');
console.log('  Name:', pkg.name);
console.log('  Version:', pkg.version);
console.log('  Main:', pkg.main || 'not specified');
console.log('  Start script:', pkg.scripts?.start || 'not specified');
console.log('  Dependencies count:', Object.keys(pkg.dependencies || {}).length);
console.log('  DevDependencies count:', Object.keys(pkg.devDependencies || {}).length);
"

echo
echo "3️⃣ CHECKING FOR LARGE FILES"
echo "==========================="

log_info "Scanning for files larger than 10MB (can cause build issues)..."
large_files_found=false
find . -type f -size +10M -not -path "./node_modules/*" -not -path "./.git/*" | while read file; do
    size=$(du -h "$file" | cut -f1)
    log_warning "Large file: $file ($size)"
    large_files_found=true
done

if [ "$large_files_found" = false ]; then
    log_success "No problematic large files found"
fi

echo
echo "4️⃣ TESTING NODE.JS SYNTAX"
echo "========================"

log_info "Checking for syntax errors in main files..."

check_syntax() {
    if node -c "$1" 2>/dev/null; then
        log_success "$1 syntax is valid"
    else
        log_error "$1 has syntax errors:"
        node -c "$1"
        return 1
    fi
}

check_syntax "server.js" || exit 1
check_syntax "app.js" || exit 1

echo
echo "5️⃣ SIMULATING CLOUD BUILD ENVIRONMENT"
echo "==================================="

log_info "Testing npm install (similar to Cloud Build)..."

# Create a temporary directory to test clean install
TEMP_DIR=$(mktemp -d)
log_info "Creating clean test environment in $TEMP_DIR"

# Copy essential files
cp package.json "$TEMP_DIR/"
if [ -f "package-lock.json" ]; then
    cp package-lock.json "$TEMP_DIR/"
fi

cd "$TEMP_DIR"

log_info "Running npm ci (clean install)..."
if npm ci --only=production; then
    log_success "npm ci completed successfully"
else
    log_error "npm ci failed"
    cd - >/dev/null
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Return to original directory and cleanup
cd - >/dev/null
rm -rf "$TEMP_DIR"

echo
echo "6️⃣ CHECKING ENVIRONMENT DEPENDENCIES"
echo "=================================="

log_info "Checking if app requires environment variables..."

# Look for common environment variable patterns
env_vars_found=$(grep -r "process\.env\." --include="*.js" . | grep -v node_modules | wc -l)
log_info "Found $env_vars_found references to environment variables"

if [ "$env_vars_found" -gt 0 ]; then
    log_warning "App uses environment variables - ensure they're set in Cloud Run"
    log_info "Common environment variables found:"
    grep -r "process\.env\." --include="*.js" . | grep -v node_modules | head -5 | sed 's/^/  /'
fi

echo
echo "7️⃣ DIRECTORY STRUCTURE ANALYSIS"
echo "=============================="

log_info "Project structure:"
echo "📂 Root files:"
ls -la | head -10

echo
echo "📂 Business modules:"
if [ -d "business_modules" ]; then
    ls -la business_modules/
else
    log_warning "No business_modules directory found"
fi

echo
echo "8️⃣ GENERATING .gcloudignore"
echo "=========================="

log_info "Generating optimized .gcloudignore file..."

cat > .gcloudignore << 'EOF'
# Ignore development and testing files
.git/
.gitignore
README.md
*.md
.env
.env.*

# Ignore test files
_tests_/
test/
tests/
*.test.js
*.spec.js

# Ignore development tools
.eslintrc*
eslint.config.js
jest.config.js

# Ignore logs and temporary files
logs/
*.log
cloud_run_logs.txt
logs_run.txt

# Ignore large files that aren't needed for runtime
bfg.jar
cloud-sql-proxy
*.zip
*.tar.gz

# Include only essential files for runtime
!package.json
!package-lock.json
!server.js
!app.js
!fastify.config.js
!business_modules/
!aop_modules/
!env_schemas/
!*.js
EOF

log_success ".gcloudignore file generated"

echo
echo "9️⃣ FINAL RECOMMENDATIONS"
echo "======================="

log_info "Pre-deployment checklist:"
echo "  ✓ All critical files present"
echo "  ✓ No syntax errors in main files"
echo "  ✓ npm install works correctly"
echo "  ✓ .gcloudignore generated to optimize build"

echo
log_success "Deployment verification completed!"
log_info "If all checks passed, your deployment should work."
echo
log_warning "If deployment still fails, check:"
echo "  • Cloud Build logs in Google Cloud Console"
echo "  • Ensure all Google Cloud APIs are enabled"
echo "  • Verify service account permissions"
echo "  • Check for any missing secrets in GitHub"

echo
echo "🚀 To deploy manually from local machine:"
echo "   cd backend"
echo "   gcloud run deploy eventstorm-backend --source . --region me-west1"
