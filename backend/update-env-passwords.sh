#!/bin/bash
# Script to update .env file with correct PostgreSQL and Redis passwords

ENV_FILE="/home/eventstorm1/vc-3/backend/.env"

echo "========================================="
echo "Updating .env file with correct passwords"
echo "========================================="
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    echo "Please create it first or check the path."
    exit 1
fi

echo "Backing up current .env file..."
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
echo "✅ Backup created"
echo ""

echo "Updating PostgreSQL password variables..."

# Update or add LOCAL_DATABASE_PASSWORD
if grep -q "^LOCAL_DATABASE_PASSWORD=" "$ENV_FILE"; then
    sed -i 's|^LOCAL_DATABASE_PASSWORD=.*|LOCAL_DATABASE_PASSWORD=eventstorm_secure_pass|' "$ENV_FILE"
    echo "✅ Updated LOCAL_DATABASE_PASSWORD"
else
    echo "LOCAL_DATABASE_PASSWORD=eventstorm_secure_pass" >> "$ENV_FILE"
    echo "✅ Added LOCAL_DATABASE_PASSWORD"
fi

# Update or add PG_PASSWORD (for production mode)
if grep -q "^PG_PASSWORD=" "$ENV_FILE"; then
    sed -i 's|^PG_PASSWORD=.*|PG_PASSWORD=eventstorm_secure_pass|' "$ENV_FILE"
    echo "✅ Updated PG_PASSWORD"
else
    echo "PG_PASSWORD=eventstorm_secure_pass" >> "$ENV_FILE"
    echo "✅ Added PG_PASSWORD"
fi

echo ""
echo "Updating Redis password variable..."

# Update or add REDIS_SECRET
if grep -q "^REDIS_SECRET=" "$ENV_FILE"; then
    sed -i 's|^REDIS_SECRET=.*|REDIS_SECRET=CHANGE_THIS_REDIS_PASSWORD|' "$ENV_FILE"
    echo "✅ Updated REDIS_SECRET"
else
    echo "REDIS_SECRET=CHANGE_THIS_REDIS_PASSWORD" >> "$ENV_FILE"
    echo "✅ Added REDIS_SECRET"
fi

echo ""
echo "========================================="
echo "✅ .env file updated successfully!"
echo "========================================="
echo ""
echo "Updated variables:"
echo "  - LOCAL_DATABASE_PASSWORD=eventstorm_secure_pass"
echo "  - PG_PASSWORD=eventstorm_secure_pass"
echo "  - REDIS_SECRET=CHANGE_THIS_REDIS_PASSWORD"
echo ""
echo "You can now restart the backend with:"
echo "  npm run dev-stable:local"
echo ""

