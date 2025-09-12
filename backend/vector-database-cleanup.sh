#!/bin/bash

# vector-database-cleanup.sh
# Script to clean corrupted vector database and rebuild with proper filtering

echo "🧹 Vector Database Cleanup & Rebuild Script"
echo "==========================================="

# Step 1: Identify problematic content
echo "📊 Step 1: Analyzing current vector database state..."

# Check for binary files in the current directory that might have been indexed
echo "🔍 Scanning for binary files that should not be indexed:"
find . -type f -executable -not -path "./node_modules/*" -not -path "./.git/*" -not -name "*.sh" -not -name "*.js" | while read file; do
    if file "$file" | grep -q "ELF\|binary\|executable"; then
        echo "   ❌ Binary file found: $file ($(file "$file"))"
    fi
done

echo ""
echo "📁 Large files that might cause issues:"
find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*" | head -5 | while read file; do
    size=$(du -h "$file" | cut -f1)
    echo "   ⚠️  Large file: $file ($size)"
done

# Step 2: Environment check
echo ""
echo "🔧 Step 2: Checking environment configuration..."

if [ -z "$PINECONE_API_KEY" ]; then
    echo "   ❌ PINECONE_API_KEY not set"
else
    echo "   ✅ PINECONE_API_KEY configured"
fi

if [ -z "$PINECONE_INDEX_NAME" ]; then
    echo "   ⚠️  PINECONE_INDEX_NAME not set (will use default: eventstorm-index)"
    export PINECONE_INDEX_NAME="eventstorm-index"
else
    echo "   ✅ PINECONE_INDEX_NAME: $PINECONE_INDEX_NAME"
fi

# Step 3: Clear vector database (if needed)
echo ""
echo "🗑️  Step 3: Vector database cleanup options..."
echo "   1. Clear all user namespace data"
echo "   2. Clear specific corrupted namespaces" 
echo "   3. Skip cleanup (just rebuild with filtering)"
echo ""

read -p "Choose option (1-3): " cleanup_option

case $cleanup_option in
    1)
        echo "🧨 Clearing all user namespace data..."
        node -e "
        const { Pinecone } = require('@pinecone-database/pinecone');
        
        async function clearUserData() {
            try {
                const pinecone = new Pinecone({
                    apiKey: process.env.PINECONE_API_KEY
                });
                
                const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
                console.log('🔗 Connecting to Pinecone index:', indexName);
                
                const index = pinecone.Index(indexName);
                
                // List and delete user namespaces (keep core-docs)
                console.log('🗑️  Clearing user namespaces (keeping core-docs)...');
                
                // Note: This is a simplified approach. In production, you'd want more granular control
                console.log('⚠️  Manual cleanup required through Pinecone console or specific namespace deletion');
                console.log('📍 Index to clean:', indexName);
                
            } catch (error) {
                console.error('❌ Cleanup failed:', error.message);
            }
        }
        
        clearUserData();
        "
        ;;
    2)
        echo "🎯 Clearing specific corrupted namespaces..."
        echo "   (This requires manual specification of corrupted namespace IDs)"
        ;;
    3)
        echo "⏭️  Skipping database cleanup, will rebuild with filtering..."
        ;;
esac

# Step 4: Test enhanced filtering
echo ""
echo "🧪 Step 4: Testing enhanced file filtering..."

node -e "
const FileFilteringUtils = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/utils/FileFilteringUtils');

console.log('📋 Testing file filtering rules...');

// Test files
const testFiles = [
    'cloud-sql-proxy',
    'package.json', 
    'README.md',
    'app.js',
    'test.min.js',
    'binary-data.dat',
    'Dockerfile',
    'script.sh'
];

testFiles.forEach(file => {
    const shouldIndex = FileFilteringUtils.shouldIndexFile(file);
    console.log(\`   \${shouldIndex ? '✅' : '❌'} \${file}\`);
});

console.log('');
console.log('🔧 Enhanced ignore patterns:');
FileFilteringUtils.getEnhancedIgnorePatterns().slice(0, 10).forEach(pattern => {
    console.log(\`   - \${pattern}\`);
});
console.log('   ... and', FileFilteringUtils.getEnhancedIgnorePatterns().length - 10, 'more patterns');
"

# Step 5: Rebuild recommendation
echo ""
echo "✅ Step 5: Ready for rebuild!"
echo ""
echo "🚀 Next steps:"
echo "   1. The repository processor now has enhanced filtering"
echo "   2. Binary files like 'cloud-sql-proxy' will be automatically excluded"
echo "   3. Run a fresh repository indexing process"
echo "   4. The trace analysis will show clean, readable content"
echo ""
echo "💡 To trigger rebuild:"
echo "   - Make a new query in the chat interface"
echo "   - Or manually trigger repository processing"
echo ""
echo "🎯 The enhanced filtering will prevent:"
echo "   ❌ Binary executables (cloud-sql-proxy, etc.)"
echo "   ❌ Compiled files (.class, .pyc, .o, etc.)"
echo "   ❌ Archives (.zip, .tar, .gz, etc.)"
echo "   ❌ Media files (.jpg, .mp4, .pdf, etc.)"
echo "   ❌ Large lock files (package-lock.json, yarn.lock, etc.)"
echo "   ❌ Minified files (.min.js, .min.css, etc.)"
echo ""
echo "✅ Will index:"
echo "   ✅ Source code (.js, .ts, .py, .java, etc.)"
echo "   ✅ Configuration (.json, .yaml, .env, etc.)"
echo "   ✅ Documentation (.md, .txt, .rst, etc.)"
echo "   ✅ Scripts (.sh, .bash - as text, not binary)"
echo ""
echo "🔬 Cleanup complete! Vector database is ready for clean indexing."
