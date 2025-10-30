#!/bin/bash
# Simple re-index trigger - push a dummy commit

echo "🔄 Creating dummy commit to trigger re-indexing..."
echo "# Re-index trigger: $(date)" >> .reindex-trigger
git add .reindex-trigger
git commit -m "trigger: Force re-indexing after safe rechunking fix (commit 3702515)"
git push

echo "✅ Pushed commit - GitHub Actions will deploy and webhook will trigger re-indexing"
echo "⏳ Wait 3-4 minutes for:"
echo "   1. GitHub Actions deployment (~2 min)"
echo "   2. Webhook re-indexing trigger (~1-2 min)"
echo ""
echo "📊 Monitor logs: Check Cloud Run logs for successful storage"
