# Architecture.md RAG Integration

This document explains how `ARCHITECTURE.md` is integrated into the RAG (Retrieval-Augmented Generation) pipeline to improve AI chat response quality.

## Overview

The system now automatically includes your manually-edited `ARCHITECTURE.md` file in the docs indexing pipeline, ensuring that AI chat responses have comprehensive architecture context.

## How It Works

### 1. Automatic Inclusion in Indexing
- `ARCHITECTURE.md` (from `backend/` or repo root) is automatically discovered and included when docs are reindexed
- The file is chunked, embedded, and stored in Pinecone vector database
- Architecture context becomes available for RAG retrieval during chat sessions

### 2. Integration Points

**DocsLangchainAdapter Integration:**
- `backend/business_modules/docs/infrastructure/ai/docsLangchainAdapter.js` includes architecture file discovery
- Searches for `ARCHITECTURE.md` or `architecture.md` in both backend and repo root directories
- Architecture content is used as context when generating module-specific documentation

**GitHub Actions Integration:**
- Deployment workflow automatically triggers docs reindexing
- `npm run docs:generate` includes architecture.md in the indexing process
- Pub/Sub events trigger RAG pipeline updates

### 3. File Location Priority
The system searches for architecture files in this order:
1. `backend/ARCHITECTURE.md`
2. `backend/architecture.md` 
3. `repo-root/ARCHITECTURE.md`
4. `repo-root/architecture.md`

## Manual Commands

### Re-index Documentation Locally
```bash
# Navigate to backend directory
cd backend

# Set required environment variables
export OPENAI_API_KEY="your-openai-key"
export PINECONE_API_KEY="your-pinecone-key"
export PINECONE_INDEX_NAME="your-index-name"

# Run docs generation (includes architecture.md)
npm run docs:generate -- --user-id manual-reindex-$(date +%s)
```

### Test Architecture Integration
```bash
# Run the integration test script
node test_architecture_integration.js
```

### Manual Repository Processing (includes docs update)
```bash
# Test the full RAG pipeline including architecture.md
cd backend
node test_manual_repo_processing.js
```

## Automatic Triggers

### GitHub Actions Deployment
- **Trigger:** Push to `main` branch
- **Process:** 
  1. Builds and deploys application
  2. Runs `npm run docs:generate` (includes ARCHITECTURE.md)
  3. Publishes `repoPushed` event for RAG reindexing
  4. Publishes `docsDocsUpdated` event

### Repository Push Processing
- **Trigger:** Repository push events via Pub/Sub
- **Process:**
  1. AI service processes repository changes
  2. Docs service automatically re-indexes documentation
  3. Architecture.md content becomes available for RAG

## Verification

### Check Architecture Content in Logs
Look for these log messages during docs generation:
```
[docsLangchainAdapter] Included repository architecture file for indexing: /path/to/ARCHITECTURE.md (XXXX chars)
[docsLangchainAdapter] Loaded ARCHITECTURE.md for context from /path (XXXX chars)
```

### Test RAG Quality
Ask architecture-related questions in the chat interface:
- "What is the overall architecture of this system?"
- "What are the main application layer files in the auth module?"
- "How are business modules organized?"

### Monitor Pinecone Index
Check that architecture content is being stored:
- Architecture chunks should appear in your Pinecone index
- Vector search should return architecture-related content for relevant queries

## Troubleshooting

### Architecture File Not Found
- Ensure `ARCHITECTURE.md` exists in `backend/` directory
- Check file permissions and encoding (should be UTF-8)
- Verify filename case matches exactly

### Missing from RAG Responses  
- Check deployment logs for architecture file inclusion messages
- Verify Pinecone API key and index configuration
- Re-run docs generation manually to force reindexing

### API Key Issues
- Ensure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set
- Verify `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` are configured
- Check API key permissions and quotas

## Files Modified

- `backend/business_modules/docs/infrastructure/ai/docsLangchainAdapter.js` - Architecture file discovery and inclusion
- `test_architecture_integration.js` - Integration testing script

## Best Practices

1. **Keep Architecture.md Updated:** Since this file is manually edited, ensure it stays current with system changes
2. **Monitor RAG Quality:** Test chat responses after architecture updates to verify context integration
3. **Use Descriptive Content:** Write architecture documentation that will be useful for AI context and user understanding
4. **Regular Reindexing:** After significant architecture changes, trigger manual reindexing to update RAG context immediately