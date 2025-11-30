#!/bin/bash
# install-services.sh
# Installs systemd service files

set -e

echo "==================================="
echo "Installing systemd services"
echo "==================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="$SCRIPT_DIR/../systemd"

# =====================================
# Install service files
# =====================================
echo "📦 Installing service files..."

# Redis service (optional - only if not using system default)
if [ -f "$SYSTEMD_DIR/redis.service" ]; then
  cp "$SYSTEMD_DIR/redis.service" /etc/systemd/system/
  echo "✅ Redis service installed"
fi

# PostgreSQL service (optional - only if not using system default)
if [ -f "$SYSTEMD_DIR/postgresql.service" ]; then
  cp "$SYSTEMD_DIR/postgresql.service" /etc/systemd/system/
  echo "✅ PostgreSQL service installed"
fi

# EventStorm backend service
if [ -f "$SYSTEMD_DIR/eventstorm-backend.service" ]; then
  cp "$SYSTEMD_DIR/eventstorm-backend.service" /etc/systemd/system/
  echo "✅ EventStorm backend service installed"
else
  echo "❌ Service file not found: $SYSTEMD_DIR/eventstorm-backend.service"
  exit 1
fi

# =====================================
# Reload systemd
# =====================================
echo ""
echo "⚙️  Reloading systemd..."
systemctl daemon-reload

# =====================================
# Enable services
# =====================================
echo ""
echo "⚙️  Enabling services..."
systemctl enable eventstorm-backend.service

echo ""
echo "==================================="
echo "✅ Services Installed!"
echo "==================================="
echo ""
echo "Next steps:"
echo "  1. Review service configuration: /etc/systemd/system/eventstorm-backend.service"
echo "  2. Update environment variables in: /opt/eventstorm/backend/.env.production"
echo "  3. Start the service: systemctl start eventstorm-backend.service"
echo "  4. Check status: systemctl status eventstorm-backend.service"
echo "  5. View logs: journalctl -u eventstorm-backend.service -f"
echo ""

