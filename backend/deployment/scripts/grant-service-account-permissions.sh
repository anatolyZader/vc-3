#!/bin/bash
# grant-service-account-permissions.sh
# Grants necessary GCP IAM permissions to the compute service account

set -e

PROJECT_ID="eventstorm-1"
SERVICE_ACCOUNT="979848823566-compute@developer.gserviceaccount.com"

echo "==================================="
echo "Granting IAM Permissions"
echo "==================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# List of required roles
ROLES=(
  "roles/secretmanager.admin"           # Full access to Secret Manager
  "roles/pubsub.admin"                  # Full access to Pub/Sub
  "roles/cloudsql.client"               # Access to Cloud SQL (if needed)
  "roles/logging.logWriter"             # Write logs
  "roles/monitoring.metricWriter"       # Write metrics
)

echo "📝 Granting IAM roles to service account..."
echo ""

for ROLE in "${ROLES[@]}"; do
  echo "Adding role: $ROLE"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="$ROLE" \
    --condition=None \
    2>/dev/null || echo "  ⚠️  Failed to add $ROLE (may already exist or need different permissions)"
done

echo ""
echo "==================================="
echo "✅ Permissions Update Complete"
echo "==================================="
echo ""
echo "Run this script as a user with Owner/Admin permissions:"
echo "  bash grant-service-account-permissions.sh"
echo ""
echo "Then verify with:"
echo "  gcloud secrets list"
echo ""

