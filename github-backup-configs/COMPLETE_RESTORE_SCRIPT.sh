#!/bin/bash
# EventStorm COMPLETE Infrastructure Restoration Script
# This script recreates ALL infrastructure components found in the backup

set -e

# Configuration - UPDATE THESE VALUES
export NEW_PROJECT_ID="your-new-project-id"
export NEW_REGION="me-west1"  # Keep same region for compatibility
export SERVICE_ACCOUNT_NAME="eventstorm-app"

echo "🚀 Starting COMPLETE EventStorm restoration..."
echo "Target project: $NEW_PROJECT_ID"
echo "Target region: $NEW_REGION"

# 1. Set up new project
echo "📋 Setting up new project..."
gcloud config set project $NEW_PROJECT_ID

# 2. Enable ALL required APIs (from enabled-services.json)
echo "🔌 Enabling required APIs..."
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable vpcaccess.googleapis.com
gcloud services enable servicenetworking.googleapis.com
# Add more from enabled-services.json as needed

# 3. Create VPC and networking (if needed)
echo "🌐 Setting up VPC networking..."
# Default VPC should exist, but create private service connection for Redis
gcloud compute addresses create google-managed-services-default \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default

# 4. Create Redis Memorystore instance (CRITICAL!)
echo "⚡ Creating Redis instance..."
gcloud redis instances create es \
  --size=2 \
  --region=$NEW_REGION \
  --network=default \
  --connect-mode=private-service-access \
  --redis-version=redis_7_2 \
  --tier=basic

# Get Redis IP for later use
export REDIS_HOST=$(gcloud redis instances describe es --region=$NEW_REGION --format="value(host)")
echo "Redis created at: $REDIS_HOST"

# 5. Create VPC Connector for Cloud Run
echo "🔗 Creating VPC connector..."
gcloud compute networks vpc-access connectors create cr-vpc-conn \
  --region=$NEW_REGION \
  --range=10.8.0.0/28 \
  --network=default

# 6. Create service account
echo "👤 Creating service account..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name="EventStorm Application Service Account"

# 7. Grant permissions
echo "🔐 Granting permissions..."
export SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${NEW_PROJECT_ID}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $NEW_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding $NEW_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/redis.editor"
gcloud projects add-iam-policy-binding $NEW_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/pubsub.editor"
gcloud projects add-iam-policy-binding $NEW_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectAdmin"
gcloud projects add-iam-policy-binding $NEW_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# 8. Create ALL Secret Manager secrets
echo "🔐 Creating Secret Manager secrets..."
echo "⚠️  You must populate these with actual values from your backup!"

# Create empty secrets (you'll need to update with real values)
secrets=("jwt-secret" "cookie-secret" "session-secret" "pg-pwd" "github-token" "google-oauth2-secret" "redis-secret")
for secret in "${secrets[@]}"; do
  echo "placeholder-value" | gcloud secrets create $secret --data-file=-
  echo "Created secret: $secret (UPDATE WITH REAL VALUE!)"
done

# 9. Restore Cloud SQL
echo "🗄️  Creating Cloud SQL instance..."
gcloud sql instances create eventstorm-pg-instance-1 \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-16384 \
  --region=$NEW_REGION \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --network=default \
  --no-assign-ip

# Create database and user  
gcloud sql databases create eventstorm_db --instance=eventstorm-pg-instance-1
gcloud sql users create postgres \
  --instance=eventstorm-pg-instance-1 \
  --password=CHANGE_THIS_PASSWORD

# 10. Restore Pub/Sub
echo "📨 Creating Pub/Sub topics and subscriptions..."
# Main topics
gcloud pubsub topics create chat-topic
gcloud pubsub topics create ai-topic
gcloud pubsub topics create main-topic  
gcloud pubsub topics create git-topic
gcloud pubsub topics create wiki-topic

# Dead letter topics
gcloud pubsub topics create ai-topic-dead-filter
gcloud pubsub topics create ai-topic-dead-letter
gcloud pubsub topics create chat-topic-dead-filter
gcloud pubsub topics create chat-topic-dead-letter

# Subscriptions
gcloud pubsub subscriptions create ai-sub \
  --topic=ai-topic \
  --ack-deadline=60 \
  --dead-letter-topic=ai-topic-dead-filter \
  --max-delivery-attempts=5

gcloud pubsub subscriptions create main-sub \
  --topic=main-topic \
  --ack-deadline=10

gcloud pubsub subscriptions create gi-sub \
  --topic=git-topic \
  --ack-deadline=10

gcloud pubsub subscriptions create ai-dead-letter-sub \
  --topic=ai-topic-dead-filter \
  --ack-deadline=600

# 11. Final setup information
echo "✅ Infrastructure restoration complete!"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Update all Secret Manager secrets with real values"
echo "2. Extract and deploy application code: tar -xzf eventstorm-code-backup.tar.gz"
echo "3. Update .env file with new connection strings:"
echo "   - REDIS_HOST=$REDIS_HOST"
echo "   - CLOUD_SQL_CONNECTION_NAME=$NEW_PROJECT_ID:$NEW_REGION:eventstorm-pg-instance-1"
echo "4. Deploy to Cloud Run with VPC connector"
echo "5. Test all connections"
echo ""
echo "🚨 IMPORTANT: This script creates the infrastructure but you still need to:"
echo "   - Populate secrets with real values"
echo "   - Deploy application code"  
echo "   - Update OAuth2 redirect URIs"
echo "   - Restore database data from SQL backup"
