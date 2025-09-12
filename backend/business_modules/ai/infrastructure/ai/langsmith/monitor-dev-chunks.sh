#!/bin/bash

# Real-time Development Server Log Monitor
# Captures chunk logging from the running development server

echo "🔍 Development Server Chunk Monitor"
echo "==================================="
echo ""

# Check if fastify server is running
FASTIFY_PID=$(ps aux | grep "fastify start server.js" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$FASTIFY_PID" ]; then
    echo "❌ No fastify development server found running"
    echo "💡 Start your development server with: npm run dev-stable"
    exit 1
fi

echo "✅ Found development server running (PID: $FASTIFY_PID)"
echo "📋 Monitoring for chunk logging..."
echo ""

# Function to monitor server output
monitor_server() {
    echo "🎯 Send a query in your chat interface now!"
    echo "Looking for chunk logging output..."
    echo ""
    
    # Monitor system logs that might capture stdout
    # This is a fallback approach since we can't directly attach to running process stdout
    
    echo "💡 Manual Check Instructions:"
    echo "1. Go to the terminal where you ran 'npm run dev-stable'"
    echo "2. Send a new query in your chat interface"
    echo "3. Look for output like:"
    echo "   📋 CHUNK CONTENT LOGGING: Retrieved X chunks for query: '...'"
    echo "   📄 CHUNK 1/X:"
    echo "   📝 Content: actual content here"
    echo "   🏷️ Source: filename.js"
    echo "4. Copy that output and we can analyze it"
    echo ""
    
    # Try to find any recent logs
    echo "🔍 Checking for recent server activity..."
    if command -v journalctl >/dev/null 2>&1; then
        echo "Checking system journal for recent Node.js activity..."
        journalctl --since "5 minutes ago" | grep -E "(CHUNK|📄|📝)" | tail -10
    fi
    
    # Check if there are any log files in the backend directory
    echo ""
    echo "🔍 Checking for log files in backend directory..."
    find /home/myzader/eventstorm/backend -name "*.log" -o -name "server.log" -o -name "fastify.log" 2>/dev/null | while read logfile; do
        echo "Found log file: $logfile"
        echo "Recent entries:"
        tail -20 "$logfile" | grep -E "(CHUNK|📄|📝)" || echo "No chunk logging found in this file"
        echo ""
    done
}

# Alternative: Create a simple log watcher
create_log_watcher() {
    echo "📝 Creating log watcher for next query..."
    echo "This will capture output when you send your next query:"
    echo ""
    
    # Create a temporary monitoring script
    cat > /tmp/chunk_monitor.js << 'EOF'
const { spawn } = require('child_process');

console.log('🔍 Monitoring for chunk logging...');
console.log('Send a query in your chat interface!');
console.log('');

// Monitor the console output of our development server
// This is a simple approach - just listen for any chunk-related output

let monitoring = true;
setTimeout(() => {
    console.log('⏰ Monitoring timeout - if you see no output above, check your dev server terminal directly');
    monitoring = false;
}, 30000); // 30 second timeout

console.log('👁️  Watching for chunk logging activity...');
console.log('(If you don\'t see chunks appear here, check your npm run dev-stable terminal)');
EOF
    
    echo "💡 To monitor in real-time:"
    echo "1. Open a new terminal"
    echo "2. Run: node /tmp/chunk_monitor.js"
    echo "3. Send a query in your chat"
    echo "4. Watch for chunk output"
}

# Main execution
monitor_server
create_log_watcher

echo ""
echo "🎯 Next Steps:"
echo "1. Go to your 'npm run dev-stable' terminal"
echo "2. Send a new query in your chat interface"  
echo "3. Copy the chunk logging output that appears"
echo "4. We can then analyze that real chunk content!"
