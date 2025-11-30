#!/bin/bash
# install-dependencies.sh
# Installs Redis, PostgreSQL with pgvector, and Node.js on a Debian VM

set -e

echo "==================================="
echo "EventStorm Backend - VM Setup"
echo "==================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# =====================================
# Install Redis
# =====================================
echo ""
echo "📦 Installing Redis..."
apt-get install -y redis-server

# Configure Redis for production
echo "⚙️  Configuring Redis..."
cat > /etc/redis/redis.conf <<EOF
# Redis Configuration for EventStorm

# Network
bind 127.0.0.1
port 6379
protected-mode yes

# General
daemonize no
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log

# Persistence
save 900 1
save 300 10
save 60 10000
dir /var/lib/redis
dbfilename dump.rdb

# Memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Security
requirepass CHANGE_THIS_REDIS_PASSWORD

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
EOF

echo "⚠️  Don't forget to update the Redis password in /etc/redis/redis.conf"

# Create Redis directories
mkdir -p /var/lib/redis /var/log/redis /var/run/redis
chown -R redis:redis /var/lib/redis /var/log/redis /var/run/redis
chmod 750 /var/lib/redis /var/log/redis

# =====================================
# Install PostgreSQL 15 with pgvector
# =====================================
echo ""
echo "📦 Installing PostgreSQL 15..."

# Install PostgreSQL
apt-get install -y wget gnupg2
echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update
apt-get install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# Install build dependencies for pgvector
apt-get install -y build-essential postgresql-server-dev-15 git

# Install pgvector extension
echo "📦 Installing pgvector extension..."
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
cd /
rm -rf /tmp/pgvector

echo "✅ pgvector installed"

# =====================================
# Configure PostgreSQL
# =====================================
echo ""
echo "⚙️  Configuring PostgreSQL..."

# Update PostgreSQL configuration for production
PG_CONF="/etc/postgresql/15/main/postgresql.conf"
PG_HBA="/etc/postgresql/15/main/pg_hba.conf"

# Backup original configs
cp $PG_CONF ${PG_CONF}.backup
cp $PG_HBA ${PG_HBA}.backup

# Update postgresql.conf
cat >> $PG_CONF <<EOF

# EventStorm Configuration
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
EOF

# Restart PostgreSQL to apply changes
systemctl restart postgresql

# =====================================
# Create EventStorm Database
# =====================================
echo ""
echo "⚙️  Creating EventStorm database and user..."

sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE eventstorm_db;

-- Create user (CHANGE PASSWORD!)
CREATE USER eventstorm_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE eventstorm_db TO eventstorm_user;

-- Connect to database and enable pgvector
\c eventstorm_db

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO eventstorm_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO eventstorm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO eventstorm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO eventstorm_user;
EOF

echo "✅ Database created"
echo "⚠️  Don't forget to update the database password!"

# =====================================
# Install Node.js 18
# =====================================
echo ""
echo "📦 Installing Node.js 18..."

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo "✅ Node.js $(node --version) installed"
echo "✅ npm $(npm --version) installed"

# =====================================
# Install GCP SDK (for Secret Manager access)
# =====================================
echo ""
echo "📦 Installing Google Cloud SDK..."

echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
apt-get install -y apt-transport-https ca-certificates gnupg
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
apt-get update
apt-get install -y google-cloud-sdk

echo "✅ Google Cloud SDK installed"

# =====================================
# Create application user
# =====================================
echo ""
echo "👤 Creating application user..."

if ! id -u appuser > /dev/null 2>&1; then
  useradd -m -u 1001 -s /bin/bash appuser
  echo "✅ User 'appuser' created"
else
  echo "ℹ️  User 'appuser' already exists"
fi

# =====================================
# Create application directory
# =====================================
echo ""
echo "📁 Creating application directories..."

mkdir -p /opt/eventstorm/backend
mkdir -p /opt/eventstorm/backend/logs
chown -R appuser:appuser /opt/eventstorm

echo "✅ Application directories created"

# =====================================
# Enable services
# =====================================
echo ""
echo "⚙️  Enabling services..."

systemctl enable redis-server
systemctl enable postgresql

echo "✅ Services enabled"

# =====================================
# Summary
# =====================================
echo ""
echo "==================================="
echo "✅ Installation Complete!"
echo "==================================="
echo ""
echo "Installed:"
echo "  - Redis $(redis-server --version | head -n1)"
echo "  - PostgreSQL $(sudo -u postgres psql --version)"
echo "  - pgvector extension"
echo "  - Node.js $(node --version)"
echo "  - Google Cloud SDK"
echo ""
echo "⚠️  IMPORTANT: Update these passwords:"
echo "  1. Redis: /etc/redis/redis.conf (requirepass)"
echo "  2. PostgreSQL: Run as postgres user:"
echo "     sudo -u postgres psql -c \"ALTER USER eventstorm_user PASSWORD 'your_secure_password';\""
echo ""
echo "Next steps:"
echo "  1. Update passwords (see above)"
echo "  2. Set up GCP authentication: gcloud auth application-default login"
echo "  3. Deploy your application to /opt/eventstorm/backend"
echo "  4. Install systemd services"
echo "  5. Start services"
echo ""

