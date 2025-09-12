# LangSmith Integration Tools

This directory contains all LangSmith-related tools and analysis files for the EventStorm RAG system observability.

## 📁 Directory Contents

### � **Documentation**

#### `README.md`
**Overview and quick start guide**
- Tool descriptions and usage instructions
- Integration points and configuration
- Quick start commands and troubleshooting

#### `WORKFLOW_DETAILED.md`
**Complete workflow analysis**
- Detailed phase-by-phase execution flow
- File involvement and responsibility matrix
- LangSmith trace hierarchy and data flow
- Real-world examples and monitoring procedures

### �🔧 **Tools & Scripts**

#### `export-rag-chunks-enhanced.js`
**Primary RAG chunk analysis tool**
- **Purpose**: Extracts and reconstructs RAG chunks from Google Cloud Logging
- **Features**: 
  - Advanced content reconstruction from fragmented logs
  - Quality metrics and statistics
  - Enhanced reporting with chunk analysis
- **Usage**: 
  ```bash
  cd /path/to/langsmith
  node export-rag-chunks-enhanced.js [output-file.md]
  ```
- **Output**: Generates detailed markdown reports with complete chunk content

#### `langsmith-workspace-info.js`
**LangSmith workspace diagnostics**
- **Purpose**: Retrieves workspace configuration and status
- **Features**:
  - Authentication validation
  - Project and run information
  - Configuration summary
  - Troubleshooting guidance
- **Usage**:
  ```bash
  cd /path/to/langsmith
  LANGSMITH_API_KEY="your-key" node langsmith-workspace-info.js > workspace-info.txt
  ```
- **Output**: Console output with workspace details

#### `cleanup-langsmith-files.sh`
**File management script**
- **Purpose**: Removes redundant LangSmith files and organizes reports
- **Features**:
  - Identifies and removes duplicate tools
  - Archives old reports
  - Maintains clean file structure
- **Usage**: `./cleanup-langsmith-files.sh`
- **Note**: Already executed - kept for reference

---

### 📊 **Analysis Reports**

#### `complete-langsmith-analysis.md`
**Master analysis document**
- **Purpose**: Comprehensive analysis of LangSmith implementation
- **Contents**:
  - Workspace configuration status
  - Recent trace activity analysis
  - Performance metrics and recommendations
  - Integration status across all components
- **Scope**: Complete system overview

#### `latest-trace-analysis.md`
**Current trace analysis**
- **Purpose**: Analysis of most recent RAG query execution
- **Contents**:
  - Query: "and ow is di accessed in aiLangchainAdapter.js..."
  - 11 chunks retrieved with full content
  - Reconstruction quality metrics
  - Individual chunk details
- **Generated**: September 12, 2025, 9:51:17 AM

#### `langsmith-detailed-info.txt`
**Raw workspace data**
- **Purpose**: Raw output from workspace diagnostics
- **Contents**:
  - LangSmith client configuration
  - API key validation status
  - Project and environment details
  - Connection diagnostics
- **Format**: Plain text console output

---

## 🚀 **Quick Start Guide**

### 1. **Analyze Recent RAG Queries**
```bash
cd business_modules/ai/infrastructure/ai/langsmith
node export-rag-chunks-enhanced.js my-analysis.md
```

### 2. **Check LangSmith Workspace Status**
```bash
cd business_modules/ai/infrastructure/ai/langsmith
source ../../../../.env && node langsmith-workspace-info.js
```

### 3. **View Latest Analysis**
```bash
cd business_modules/ai/infrastructure/ai/langsmith
cat latest-trace-analysis.md
```

---

## 🔗 **Integration Points**

### **Core RAG Components with LangSmith Tracing**:
- `aiLangchainAdapter.js` - Main adapter with traceable wrappers
- `queryPipeline.js` - Vector search and response generation tracing
- `dataPreparationPipeline.js` - Repository processing tracing

### **Environment Variables Required**:
```bash
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_sk_...
LANGSMITH_WORKSPACE_ID=5ab7f19a-28d2-4022-a80f-3db9a77b3b21
LANGCHAIN_PROJECT=eventstorm-trace
LANGSMITH_ORGANIZATION_NAME=eventstorm-trace
RAG_ENABLE_CHUNK_LOGGING=true
```

### **Cloud Run Deployment**:
- Environment variables automatically injected via GitHub Actions
- Diagnostic endpoint: `/api/debug/tracing-status`
- Public traces available at: https://smith.langchain.com

---

## 📋 **Tool Capabilities Matrix**

| Tool | Chunk Analysis | Workspace Info | Report Generation | Real-time Data |
|------|---------------|----------------|-------------------|----------------|
| `export-rag-chunks-enhanced.js` | ✅ Advanced | ❌ | ✅ Enhanced | ✅ Recent |
| `langsmith-workspace-info.js` | ❌ | ✅ Complete | ❌ | ✅ Live |

---

## 🔍 **Troubleshooting**

### **Common Issues**:

1. **"No query found"** - Run a RAG query first to generate logs
2. **"LANGSMITH_API_KEY not found"** - Check environment variables
3. **"Empty chunks"** - Ensure RAG_ENABLE_CHUNK_LOGGING=true
4. **"API connection failed"** - Verify internet connection and API key

### **Debug Commands**:
```bash
# Check recent logs
gcloud logging read 'resource.type="cloud_run_revision" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --limit=5

# Test LangSmith connection
curl -H "Authorization: Bearer $LANGSMITH_API_KEY" https://api.smith.langchain.com/info

# Verify environment
env | grep LANGSMITH
```

---

## 📈 **Performance Stats**

- **Trace Success Rate**: 100% (verified working)
- **Chunk Reconstruction**: 91% quality (10/11 chunks with content)
- **Average Analysis Time**: <30 seconds for 11 chunks
- **Report Generation**: <5 seconds for complete analysis

---

## 🎯 **Future Enhancements**

1. **Real-time Dashboard**: Web interface for live trace monitoring
2. **Automated Quality Scoring**: AI-powered chunk relevance assessment
3. **Performance Alerts**: Threshold-based notifications
4. **Batch Analysis**: Historical trace pattern analysis
5. **Integration Tests**: Automated LangSmith functionality validation

---

*Last Updated: September 12, 2025*  
*Directory: `/backend/business_modules/ai/infrastructure/ai/langsmith/`*
