#!/bin/bash
# deploy-app.sh
# Deploys the EventStorm backend application to the VM

set -e

APP_DIR="/opt/eventstorm/backend"
BACKUP_DIR="/opt/eventstorm/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==================================="
echo "EventStorm Backend - Deployment"
echo "==================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Check if source directory is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <source_directory>"
  echo "Example: $0 /tmp/backend"
  exit 1
fi

SOURCE_DIR="$1"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Source directory not found: $SOURCE_DIR"
  exit 1
fi

# =====================================
# Backup existing application
# =====================================
if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
  echo "📦 Backing up existing application..."
  mkdir -p "$BACKUP_DIR"
  tar -czf "$BACKUP_DIR/backend-$TIMESTAMP.tar.gz" -C "$APP_DIR" . 2>/dev/null || true
  echo "✅ Backup saved to $BACKUP_DIR/backend-$TIMESTAMP.tar.gz"
fi

# =====================================
# Stop existing application
# =====================================
echo ""
echo "⏸️  Stopping application..."
systemctl stop eventstorm-backend.service 2>/dev/null || true

# =====================================
# Deploy new version
# =====================================
echo ""
echo "📦 Deploying new version..."

# Clean application directory (but keep logs)
rm -rf $APP_DIR/node_modules
rm -rf $APP_DIR/business_modules
rm -rf $APP_DIR/aop_modules
rm -f $APP_DIR/*.js
rm -f $APP_DIR/*.json
rm -f $APP_DIR/*.md

# Copy new files
cp -r $SOURCE_DIR/* $APP_DIR/

# Ensure logs directory exists
mkdir -p $APP_DIR/logs

# Set correct permissions
chown -R appuser:appuser $APP_DIR

echo "✅ Files deployed"

# =====================================
# Install dependencies
# =====================================
echo ""
echo "📦 Installing dependencies..."
cd $APP_DIR
sudo -u appuser npm ci --only=production

echo "✅ Dependencies installed"

# =====================================
# Restart application
# =====================================
echo ""
echo "🚀 Starting application..."
systemctl start eventstorm-backend.service

# Wait a moment for startup
sleep 3

# Check status
if systemctl is-active --quiet eventstorm-backend.service; then
  echo "✅ Application started successfully"
  echo ""
  echo "Status:"
  systemctl status eventstorm-backend.service --no-pager -l
else
  echo "❌ Application failed to start"
  echo ""
  echo "Recent logs:"
  journalctl -u eventstorm-backend.service -n 50 --no-pager
  exit 1
fi

echo ""
echo "==================================="
echo "✅ Deployment Complete!"
echo "==================================="
echo ""
echo "Commands:"
echo "  - View logs: journalctl -u eventstorm-backend.service -f"
echo "  - Check status: systemctl status eventstorm-backend.service"
echo "  - Restart: systemctl restart eventstorm-backend.service"
echo ""

