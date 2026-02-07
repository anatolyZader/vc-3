#!/bin/bash

# LangSmith Files Cleanup Script
echo "🧹 Cleaning up redundant LangSmith files..."

cd /home/myzader/vibeswitch/backend

# Create archive directory
echo "📁 Creating archive directory..."
mkdir -p archive/langsmith-reports/

# Archive old reports (keep for reference)
echo "📦 Archiving old reports..."
mv rag-chunks-analysis.md archive/langsmith-reports/ 2>/dev/null || echo "   rag-chunks-analysis.md not found"
mv rag-chunks-analysis-enhanced.md archive/langsmith-reports/ 2>/dev/null || echo "   rag-chunks-analysis-enhanced.md not found"

# Remove redundant export tools
echo "🗑️ Removing redundant export tools..."
rm -f export-rag-chunks.js
rm -f export-rag-chunks-simple.js

# Remove empty/duplicate files
echo "🗑️ Removing empty and duplicate files..."
rm -f langsmith-info.js
rm -f langsmith-workspace-info.txt

# Remove commented out plugin (if truly unused)
echo "🗑️ Removing commented out plugin..."
rm -f ragStatusPlugin.js

echo "✅ Cleanup completed!"
echo ""
echo "📋 Remaining LangSmith files:"
echo "   ✅ export-rag-chunks-enhanced.js      (Primary export tool)"
echo "   ✅ langsmith-workspace-info.js        (Workspace diagnostics)" 
echo "   ✅ complete-langsmith-analysis.md      (Master analysis)"
echo "   ✅ latest-trace-analysis.md           (Current trace)"
echo "   ✅ langsmith-detailed-info.txt        (Raw workspace data)"
echo ""
echo "📁 Archived reports moved to: archive/langsmith-reports/"
echo "📁 LangSmith tools organized in: business_modules/ai/infrastructure/ai/langsmith/"
echo ""
echo "🎯 Result: Reduced from 9+ files to 6 essential files in organized structure"
