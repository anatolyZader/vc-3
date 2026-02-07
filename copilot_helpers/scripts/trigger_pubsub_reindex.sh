#!/bin/bash
# Force Re-indexing via Pub/Sub (requires gcloud CLI)

set -e

PROJECT_ID="vibeswitch-1"
TOPIC="git-topic"
USER_ID="d41402df-182a-41ec-8f05-153118bf2718"
REPO_ID="anatolyZader/vc-3"
REPO_URL="https://github.com/anatolyZader/vc-3"
BRANCH="main"
COMMIT_SHA="ad90c675a5dd33c4da3cfdc394621102407270a8"

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 MANUAL RE-INDEXING TRIGGER VIA PUB/SUB"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Topic: $TOPIC"
echo "   User: $USER_ID"
echo "   Repository: $REPO_ID"
echo "   Commit: $COMMIT_SHA (with semantic metadata preservation)"
echo ""

# Create the payload
PAYLOAD=$(cat << EOF
{
  "event": "repoPushed",
  "payload": {
    "userId": "$USER_ID",
    "repoId": "$REPO_ID",
    "repoData": {
      "url": "$REPO_URL",
      "branch": "$BRANCH",
      "githubOwner": "anatolyZader",
      "repoName": "vc-3",
      "commitHash": "$COMMIT_SHA",
      "forceUpdate": true,
      "description": "Manual re-indexing trigger - semantic metadata preservation (no rechunking)",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
      "source": "manual-pubsub-trigger"
    }
  }
}
EOF
)

echo "📤 Publishing repoPushed event to $TOPIC..."
echo ""
echo "$PAYLOAD" | jq '.' || echo "$PAYLOAD"
echo ""

# Publish to Pub/Sub
gcloud pubsub topics publish "$TOPIC" \
  --message="$PAYLOAD" \
  --project="$PROJECT_ID"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ PUBLISHED SUCCESSFULLY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "⏱️  Expected processing time: 10-15 minutes"
echo ""
echo "🔍 To monitor progress:"
echo "   gcloud logging tail \"resource.type=cloud_run_revision\" \\"
echo "     --project=$PROJECT_ID \\"
echo "     --filter='textPayload:\"repoPushed\"'"
echo ""
echo "✅ After ~15 minutes, test with:"
echo "   Query: 'list all methods in aiService.js'"
echo "   Expected: 3 methods with semantic_role, unit_name metadata"
echo "   Expected: No 'rechunked': true in metadata"
echo ""
