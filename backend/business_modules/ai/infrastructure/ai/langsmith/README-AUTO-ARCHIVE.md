# LangSmith Integration & Trace Analysis Tools

This directory contains comprehensive tools for LangSmith integration and **automated RAG trace analysis**.

## 🔄 **Automatic Trace Archiving System** (NEW!)

The system now automatically archives previous trace analyses and creates new ones for each query.

### How It Works:
1. **Before each query**: Previous `latest-trace-analysis.md` is archived to `langsmith-archive/`
2. **During query**: New trace template is created 
3. **After query**: Detailed analysis is generated with actual chunk data
4. **Cleanup**: Old archives are automatically cleaned up (keeps last 20 by default)

### Archive Naming Convention:
```
trace-YYYY-MM-DDTHH-MM-SS-query-summary.md
```
Example: `trace-2025-09-12T12-25-26-business-vs-aop-modules.md`

## 📁 Directory Structure

```
langsmith/
├── latest-trace-analysis.md          # ← Current/latest trace analysis (auto-updated)
├── langsmith-archive/                # ← Archived trace analyses
│   ├── trace-2025-09-12T11-58-58-business-vs-aop.md
│   ├── trace-2025-09-12T10-30-45-dependency-injection.md
│   └── ...
├── trace-archiver.js                 # ← Automatic archiving system
├── manage-trace-archive.sh           # ← Archive management utility
├── test-trace-archiver.sh           # ← Test archiving system
└── [other tools...]
```

## 🔧 Management Commands

### Archive Management:
```bash
# List all archived traces
./manage-trace-archive.sh list

# Show archive statistics
./manage-trace-archive.sh stats

# Clean up old archives (keep last 10)
./manage-trace-archive.sh clean 10

# Show latest archived trace
./manage-trace-archive.sh latest

# Show current trace status
./manage-trace-archive.sh current

# Test the archiver
./manage-trace-archive.sh test
```

### Quick Commands:
```bash
cd backend/business_modules/ai/infrastructure/ai/langsmith

# See what's in the archive
ls -la langsmith-archive/

# Check current trace
head latest-trace-analysis.md

# Clean up (keep last 5)
./manage-trace-archive.sh clean 5
```

## 🚀 Integration Details

### Automatic Integration
The archiver is automatically integrated into the QueryPipeline:
- **Location**: `rag_pipelines/query/queryPipeline.js`
- **Trigger**: When `RAG_ENABLE_CHUNK_LOGGING=true` and chunks are retrieved
- **Process**: Archive → Template → Query Processing → Analysis Update

### Environment Variables
```bash
# Enable chunk logging and automatic archiving
RAG_ENABLE_CHUNK_LOGGING=true

# LangSmith configuration
LANGSMITH_TRACING=true
LANGCHAIN_PROJECT=eventstorm-trace
```

## 📊 Analysis Content

Each archived trace includes:
- **Query Details**: Original question, timestamp, user info
- **Execution Flow**: Initialization, search strategy, results
- **Chunk Analysis**: Full content of all retrieved documents
- **Performance Metrics**: Speed, relevance, diversity scores
- **Recommendations**: Suggestions for optimization
- **Source Analysis**: Repository coverage, document types

## 🎯 Key Features

### ✅ Automatic Operations:
- Archive previous analysis before each query
- Generate comprehensive trace analysis after each query
- Clean up old archives automatically
- No manual intervention required

### ✅ Rich Analysis:
- Complete chunk content and metadata
- Performance metrics and scoring
- Source type distribution
- Query classification and recommendations

### ✅ Management Tools:
- List, view, and manage archives
- Statistics and growth trends
- Test and validation utilities
- Easy cleanup and maintenance

## 🔍 How to Use

### For Regular Users:
1. **Just run queries** - the system handles everything automatically
2. **Check latest analysis**: `cat latest-trace-analysis.md`
3. **View archive**: `./manage-trace-archive.sh list`

### For Developers:
1. **Enable logging**: Set `RAG_ENABLE_CHUNK_LOGGING=true`
2. **Monitor archives**: Use management scripts
3. **Customize analysis**: Edit `trace-archiver.js`
4. **Debug issues**: Check archive contents and logs

## 📈 Performance

### Timing:
- **Archive operation**: ~50ms per trace
- **Analysis generation**: ~100-200ms per query
- **No impact** on query response time (runs asynchronously)

### Storage:
- **Average trace size**: 5-15KB per analysis
- **Archive cleanup**: Configurable retention (default: 20 files)
- **Growth rate**: ~1-5 traces per day (typical usage)

## 🛠 Troubleshooting

### Common Issues:

**Archives not being created:**
```bash
# Check if archiver is working
./test-trace-archiver.sh

# Verify environment variable
echo $RAG_ENABLE_CHUNK_LOGGING
```

**Permission errors:**
```bash
# Fix permissions
chmod +x *.sh
chown -R $USER:$USER langsmith-archive/
```

**Archive directory missing:**
```bash
# Recreate directory
mkdir -p langsmith-archive
./test-trace-archiver.sh
```

### Monitoring:
```bash
# Watch for new archives being created
watch -n 5 "ls -la langsmith-archive/"

# Monitor current trace updates
watch -n 2 "head -n 10 latest-trace-analysis.md"
```

## 📚 Legacy Tools

The following tools are maintained for specific use cases:
- `export-rag-chunks-enhanced.js` - Manual chunk export
- `langsmith-workspace-info.js` - Workspace diagnostics  
- `realtime-trace-analyzer.js` - Direct LangSmith API access
- `dev-console-monitor.js` - Development mode guidance

## 🔄 4-Phase LangSmith Workflow

### Phase 1: Initialization 🎯
- LangSmith connection setup
- Project configuration (`eventstorm-trace`)
- Tracing decorators applied

### Phase 2: Data Preparation 📚  
- Repository processing with tracing
- Document indexing and chunking
- Vector embedding generation

### Phase 3: Query Processing 🔍
- Vector search with automatic archiving
- Context retrieval and analysis
- LLM response generation

### Phase 4: Analysis & Archive 📊
- Automatic trace archiving
- Comprehensive analysis generation
- Performance metrics and recommendations

---

**Auto-Updated**: This README reflects the latest automatic archiving system  
**Last Modified**: 2025-09-12  
**Version**: 2.0 (Automatic Archiving)
