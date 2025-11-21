#!/bin/bash

# manage-trace-archive.sh - Management utility for LangSmith trace archives

LANGSMITH_DIR="/home/myzader/eventstorm/backend/business_modules/ai/infrastructure/ai/langsmith"
ARCHIVE_DIR="$LANGSMITH_DIR/langsmith-archive"

cd "$LANGSMITH_DIR"

show_help() {
    echo "🔧 Trace Archive Management Utility"
    echo "===================================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  list        - List all archived trace files"
    echo "  clean       - Clean up old archives (keep last 20)"
    echo "  clean N     - Clean up old archives (keep last N)"
    echo "  stats       - Show archive statistics"
    echo "  latest      - Show latest archived file"
    echo "  current     - Show current trace analysis status"
    echo "  test        - Test the archiver system"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 list                    # List all archives"
    echo "  $0 clean 10               # Keep only last 10 archives"
    echo "  $0 stats                  # Show statistics"
}

list_archives() {
    echo "📂 Trace Archive Contents"
    echo "========================"
    
    if [ ! -d "$ARCHIVE_DIR" ]; then
        echo "❌ Archive directory not found: $ARCHIVE_DIR"
        return 1
    fi
    
    local archive_files=($(ls -t "$ARCHIVE_DIR"/trace-*.md 2>/dev/null))
    
    if [ ${#archive_files[@]} -eq 0 ]; then
        echo "📭 No archived trace files found"
        return 0
    fi
    
    echo "Found ${#archive_files[@]} archived trace files:"
    echo ""
    
    for i in "${!archive_files[@]}"; do
        local file="${archive_files[$i]}"
        local basename=$(basename "$file")
        local size=$(stat -c%s "$file" 2>/dev/null || echo "0")
        local date=$(stat -c%y "$file" 2>/dev/null | cut -d' ' -f1)
        
        # Extract query from filename
        local query=$(echo "$basename" | sed 's/trace-[0-9T-]*-\(.*\)\.md/\1/' | tr '-' ' ')
        
        printf "%2d. %s\n" $((i+1)) "$basename"
        printf "    📅 %s | 📏 %s bytes | 🔍 %s\n" "$date" "$size" "$query"
        echo ""
    done
}

clean_archives() {
    local keep_count=${1:-20}
    
    echo "🧹 Cleaning Archive (keeping last $keep_count files)"
    echo "===================================================="
    
    if [ ! -d "$ARCHIVE_DIR" ]; then
        echo "❌ Archive directory not found: $ARCHIVE_DIR"
        return 1
    fi
    
    node -e "
    const TraceArchiver = require('./trace-archiver.js');
    const archiver = new TraceArchiver();
    
    archiver.cleanupArchives($keep_count)
      .then(result => {
        console.log(\`✅ Cleanup complete: \${result.deleted} files deleted\`);
      })
      .catch(error => {
        console.error('❌ Cleanup failed:', error.message);
      });
    "
}

show_stats() {
    echo "📊 Trace Archive Statistics"
    echo "=========================="
    
    if [ ! -d "$ARCHIVE_DIR" ]; then
        echo "❌ Archive directory not found: $ARCHIVE_DIR"
        return 1
    fi
    
    local total_files=$(ls "$ARCHIVE_DIR"/trace-*.md 2>/dev/null | wc -l)
    local total_size=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)
    local oldest_file=$(ls -t "$ARCHIVE_DIR"/trace-*.md 2>/dev/null | tail -n 1)
    local newest_file=$(ls -t "$ARCHIVE_DIR"/trace-*.md 2>/dev/null | head -n 1)
    
    echo "📁 Total archived files: $total_files"
    echo "💾 Total archive size: $total_size"
    echo ""
    
    if [ -n "$oldest_file" ]; then
        local oldest_date=$(stat -c%y "$oldest_file" 2>/dev/null | cut -d' ' -f1)
        echo "📅 Oldest archive: $(basename "$oldest_file") ($oldest_date)"
    fi
    
    if [ -n "$newest_file" ]; then
        local newest_date=$(stat -c%y "$newest_file" 2>/dev/null | cut -d' ' -f1)
        echo "🆕 Newest archive: $(basename "$newest_file") ($newest_date)"
    fi
    
    echo ""
    echo "📈 Archive growth trend (last 7 days):"
    for i in {6..0}; do
        local check_date=$(date -d "$i days ago" +%Y-%m-%d)
        local day_count=$(ls "$ARCHIVE_DIR"/trace-"$check_date"*.md 2>/dev/null | wc -l)
        printf "  %s: %d files\n" "$check_date" "$day_count"
    done
}

show_latest() {
    echo "🆕 Latest Archived Trace"
    echo "======================="
    
    if [ ! -d "$ARCHIVE_DIR" ]; then
        echo "❌ Archive directory not found: $ARCHIVE_DIR"
        return 1
    fi
    
    local latest_file=$(ls -t "$ARCHIVE_DIR"/trace-*.md 2>/dev/null | head -n 1)
    
    if [ -z "$latest_file" ]; then
        echo "📭 No archived trace files found"
        return 0
    fi
    
    echo "📄 File: $(basename "$latest_file")"
    echo "📅 Date: $(stat -c%y "$latest_file" 2>/dev/null)"
    echo "📏 Size: $(stat -c%s "$latest_file" 2>/dev/null) bytes"
    echo ""
    echo "📖 Content preview (first 20 lines):"
    echo "------------------------------------"
    head -n 20 "$latest_file"
}

show_current() {
    echo "📊 Current Trace Analysis Status"
    echo "==============================="
    
    if [ -f "$LANGSMITH_DIR/latest-trace-analysis.md" ]; then
        echo "✅ Current trace file exists"
        echo "📅 Modified: $(stat -c%y "$LANGSMITH_DIR/latest-trace-analysis.md" 2>/dev/null)"
        echo "📏 Size: $(stat -c%s "$LANGSMITH_DIR/latest-trace-analysis.md" 2>/dev/null) bytes"
        echo ""
        echo "📖 Content preview (first 15 lines):"
        echo "------------------------------------"
        head -n 15 "$LANGSMITH_DIR/latest-trace-analysis.md"
    else
        echo "❌ Current trace file not found"
        echo "💡 Run a query to generate a new trace analysis"
    fi
}

test_archiver() {
    echo "🧪 Testing Trace Archiver System"
    echo "==============================="
    
    ./test-trace-archiver.sh
}

# Main command dispatcher
case "${1:-help}" in
    "list"|"ls")
        list_archives
        ;;
    "clean"|"cleanup")
        clean_archives "$2"
        ;;
    "stats"|"statistics")
        show_stats
        ;;
    "latest"|"last")
        show_latest
        ;;
    "current"|"status")
        show_current
        ;;
    "test")
        test_archiver
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
