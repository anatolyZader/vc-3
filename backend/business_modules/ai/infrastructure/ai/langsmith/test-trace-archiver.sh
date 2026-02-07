#!/bin/bash

# test-trace-archiver.sh - Test the automatic trace archiving system

echo "🧪 Testing Trace Archiver System"
echo "=================================="

cd /home/myzader/vibeswitch/backend/business_modules/ai/infrastructure/ai/langsmith

echo "📁 Current directory: $(pwd)"
echo ""

echo "📋 Current files in langsmith directory:"
ls -la
echo ""

echo "📂 Archive directory contents:"
if [ -d "langsmith-archive" ]; then
  ls -la langsmith-archive/
else
  echo "Archive directory not found"
fi
echo ""

echo "🧪 Testing TraceArchiver directly..."
node -e "
const TraceArchiver = require('./trace-archiver.js');
const archiver = new TraceArchiver();

async function test() {
  console.log('🔧 Testing archive operation...');
  
  try {
    const result = await archiver.archiveAndPrepare('test query about module encapsulation');
    console.log('✅ Archive result:', result);
    
    const archives = await archiver.listArchives();
    console.log('📂 Available archives:', archives);
    
    // Test cleanup (keep only 3 files for testing)
    const cleanup = await archiver.cleanupArchives(3);
    console.log('🧹 Cleanup result:', cleanup);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
"

echo ""
echo "📂 Archive directory after test:"
if [ -d "langsmith-archive" ]; then
  ls -la langsmith-archive/
else
  echo "Archive directory not found"
fi

echo ""
echo "📄 Current latest-trace-analysis.md content (first 10 lines):"
if [ -f "latest-trace-analysis.md" ]; then
  head -n 10 latest-trace-analysis.md
else
  echo "latest-trace-analysis.md not found"
fi

echo ""
echo "✅ Test complete!"
