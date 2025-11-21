#!/bin/bash
# Monitor Cloud Run logs for repository indexing debugging

echo "🔍 Monitoring Cloud Run logs for repository indexing..."
echo "⏳ Press Ctrl+C to stop"
echo ""

gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=eventstorm-backend AND (jsonPayload.msg~'GIT MODULE' OR jsonPayload.msg~'AI MODULE DEBUG' OR jsonPayload.msg~'DATA-PREP' OR jsonPayload.msg~'repoPushed')" \
  --limit=100 \
  --format="table(timestamp, jsonPayload.msg)" \
  --freshness=30m \
  --project=eventstorm-1
