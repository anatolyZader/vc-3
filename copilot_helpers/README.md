# Copilot Helpers

This directory contains **all** helper files, scripts, and documentation created during development from both root and backend directories. These files are **excluded from RAG indexing** to prevent contamination of AI responses.

## Directory Structure

### � `docs/` - Technical Documentation
Documentation files created during development:
- **Root documentation**: Project-level architecture and guides
- **Backend documentation**: Backend-specific integration guides and best practices
  - EMBEDDING_MANAGER_CONSTRUCTOR_FIX.md
  - FILE_TYPE_CLASSIFIER_INTEGRATION_COMPLETE.md
  - INTEGRATION_SUMMARY.md
  - MODERN_PINECONE_GUIDE.md
  - NAMESPACE_FIX_DOCUMENTATION.md
  - RAG_BEST_PRACTICES.md
  - REQUEST_QUEUE_OPTIMIZATIONS.md

### � `analysis/` - Code Analysis Reports
Analysis files and reports from various debugging sessions:
- Root analysis files (19 files)
- Backend analysis files:
  - app_js_chunks.md
  - contextPipeline_method_level_analysis.md
  - enhanced_ast_ai_adapter_chunks.md
  - enhanced_ast_app_js_chunks.md
  - forced_method_analysis_*.md
  - method_level_analysis_*.md
  - processing_report_*.md
  - chunking_success_summary.js

### � `migrations/` - Database Migration Scripts
One-time migration scripts for database schema updates:
- Root migrations (7 files)
- Backend migrations:
  - migrate_add_chunking_support.js
  - migrate_namespace.js

### 🛠️ `scripts/` - Utility Scripts
Development and debugging utilities from both root and backend:
- **Root scripts** (32 files): General development utilities
- **Backend scripts** (42 files): Backend-specific tools
  - analyze_*.js - Code analysis tools
  - check_*.js - Status checking utilities
  - clean_*.js - Cleanup and maintenance scripts
  - compare_*.js - Comparison utilities
  - create_*.js - Generation scripts
  - deployment_trigger.js - Deployment utilities
  - diagnose_*.js - Diagnostic tools
  - docs-cli.js - Documentation CLI
  - explore_*.js - Repository exploration tools
  - force_*.js - Force reprocessing utilities
  - generateSpec.js - API spec generation
  - monitor_*.js - Monitoring utilities
  - pinecone_*.js - Pinecone management tools
  - reindex_*.js - Reindexing utilities
  - verify_*.js - Verification scripts
