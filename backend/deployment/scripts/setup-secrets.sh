#!/bin/bash
# setup-secrets.sh
# Creates and populates secrets in GCP Secret Manager

set -e

PROJECT_ID="${GCP_PROJECT_ID:-eventstorm-1}"

echo "==================================="
echo "GCP Secret Manager Setup"
echo "==================================="
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Function to create or update a secret
create_or_update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2
  local DESCRIPTION=$3
  
  echo "Processing: $SECRET_NAME"
  
  # Check if secret exists
  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ℹ️  Secret exists, adding new version..."
    echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --data-file=- 2>&1 | grep -v "Created version"
  else
    echo "  ➕ Creating new secret..."
    echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic" \
      --data-file=- \
      --labels="app=eventstorm,component=backend" 2>&1 | grep -v "Created"
  fi
  
  echo "  ✅ $SECRET_NAME ready"
}

# Function to prompt for secret value
prompt_secret() {
  local SECRET_NAME=$1
  local DESCRIPTION=$2
  local DEFAULT_VALUE=$3
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Secret: $SECRET_NAME"
  echo "Description: $DESCRIPTION"
  
  if [ -n "$DEFAULT_VALUE" ]; then
    echo "Current/Default: $DEFAULT_VALUE"
    read -p "Enter new value (or press Enter to use current): " -s INPUT_VALUE
    echo ""
    if [ -z "$INPUT_VALUE" ]; then
      SECRET_VALUE="$DEFAULT_VALUE"
    else
      SECRET_VALUE="$INPUT_VALUE"
    fi
  else
    read -p "Enter value: " -s SECRET_VALUE
    echo ""
  fi
  
  if [ -n "$SECRET_VALUE" ]; then
    create_or_update_secret "$SECRET_NAME" "$SECRET_VALUE" "$DESCRIPTION"
  else
    echo "  ⚠️  Skipped (no value provided)"
  fi
}

# =====================================
# Check authentication
# =====================================
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
  echo "❌ No authenticated account found"
  echo "Please authenticate first:"
  echo "  gcloud auth login"
  exit 1
fi

echo "Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
echo ""

# =====================================
# List existing secrets
# =====================================
echo "📋 Existing secrets in project:"
echo ""
gcloud secrets list --project="$PROJECT_ID" --format="table(name,createTime)" 2>/dev/null || echo "No secrets found or insufficient permissions"
echo ""

# =====================================
# Create/Update secrets
# =====================================
echo ""
read -p "Do you want to create/update secrets interactively? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  
  # Core secrets
  prompt_secret "COOKIE_SECRET" "Secret for signing cookies" "$(openssl rand -base64 32 2>/dev/null)"
  prompt_secret "SESSION_SECRET" "Secret for session management" "$(openssl rand -base64 32 2>/dev/null)"
  prompt_secret "JWT_SECRET" "Secret for JWT token signing" "$(openssl rand -base64 32 2>/dev/null)"
  
  # Database
  prompt_secret "PG_PASSWORD" "PostgreSQL database password" ""
  
  # API Keys
  prompt_secret "GITHUB_TOKEN" "GitHub personal access token" ""
  prompt_secret "OPENAI_API_KEY" "OpenAI API key" ""
  prompt_secret "ANTHROPIC_API_KEY" "Anthropic API key" ""
  prompt_secret "GOOGLE_API_KEY" "Google API key (for Gemini)" ""
  prompt_secret "PINECONE_API_KEY" "Pinecone API key" ""
  
  # OAuth
  prompt_secret "GCP_OAUTH2_CLIENT_SECRET" "GCP OAuth2 client secret" ""
  
else
  echo "ℹ️  Skipping interactive setup"
  echo ""
  echo "You can create secrets manually with:"
  echo "  echo -n 'secret-value' | gcloud secrets create SECRET_NAME --data-file=- --project=$PROJECT_ID"
fi

echo ""
echo "==================================="
echo "✅ Secret Setup Complete"
echo "==================================="
echo ""
echo "To list all secrets:"
echo "  gcloud secrets list --project=$PROJECT_ID"
echo ""
echo "To view a secret value:"
echo "  gcloud secrets versions access latest --secret=SECRET_NAME --project=$PROJECT_ID"
echo ""
echo "To grant access to a service account:"
echo "  gcloud secrets add-iam-policy-binding SECRET_NAME \\"
echo "    --member='serviceAccount:SERVICE_ACCOUNT_EMAIL' \\"
echo "    --role='roles/secretmanager.secretAccessor' \\"
echo "    --project=$PROJECT_ID"
echo ""

