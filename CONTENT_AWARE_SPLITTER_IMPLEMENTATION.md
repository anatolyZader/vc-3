# Content-Aware Splitter Implementation

## Problem Statement

The original RAG pipeline routed **all file types** through the `EnhancedASTCodeSplitter`, which is explicitly designed for JavaScript/TypeScript code. This caused significant issues:

- ❌ **Markdown files** lost their header structure and sections
- ❌ **OpenAPI specifications** lost operation and schema boundaries  
- ❌ **YAML/JSON configs** lost their key-based organization
- ❌ **Documentation files** were treated as code, losing semantic meaning

## Solution: Content-Aware Splitter Router

Created `ContentAwareSplitterRouter.js` that intelligently routes documents to specialized splitters based on content type and file extension.

### Architecture

```
Document → Content Detection → Specialized Splitter → Optimized Chunks
    ↓              ↓                      ↓               ↓
   Any File    File Type          Appropriate       Structured
               Analysis           Splitter          Output
```

### Routing Logic

| Content Type | File Extensions | Splitter Strategy | Chunk Type |
|-------------|----------------|------------------|------------|
| **Code** | `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, etc. | Enhanced AST Splitter | Classes, functions, semantic units |
| **Markdown** | `.md`, `.markdown` | Header-aware splitter | Sections by headers |
| **OpenAPI** | `*api*.json`, `*swagger*.json` | Operation-centric | API operations, schemas |
| **YAML Config** | `.yml`, `.yaml` | Key-block splitter | Top-level configuration blocks |
| **JSON Config** | `.json` (non-API) | Key-centric | Configuration sections |
| **JSON Schema** | `*schema*.json` | Schema-definition | Schema definitions, properties |
| **Documentation** | `.txt`, `.rst`, `README*` | Paragraph-aware | Document sections |
| **Generic** | Other files | Standard text splitter | Generic text chunks |

## Implementation Details

### 1. Content Type Detection

```javascript
detectContentType(document) {
  const source = document.metadata?.source || '';
  const content = document.pageContent || document.content || '';
  const extension = this.getFileExtension(source).toLowerCase();
  
  // Smart detection based on file extension, filename patterns, and content analysis
  if (this.isCodeFile(extension)) return 'code';
  if (extension === '.md') return 'markdown';
  if (this.isOpenAPIFile(source, content)) return 'openapi';
  // ... additional detection logic
}
```

### 2. Specialized Splitting Strategies

#### Code Files (JavaScript/TypeScript)
- Uses `EnhancedASTCodeSplitter`
- Preserves class and function boundaries
- Maintains import context
- Quality optimization and semantic analysis

#### Markdown Documents
- Uses header-based splitting (`MarkdownTextSplitter`)
- Preserves document structure
- Splits by `#`, `##`, `###`, `####` headers
- Large chunks further split while maintaining context

#### OpenAPI Specifications
- Operation-centric splitting
- Each API operation becomes a separate chunk
- Component schemas split separately
- Preserves `operationId`, method, path information

#### Configuration Files
- YAML: Split by top-level keys
- JSON: Split by top-level configuration sections
- Preserves configuration structure and relationships

### 3. Integration with Repository Processor

**Before:**
```javascript
// BROKEN: All files forced through AST splitter
const enhancedChunks = await this.enhancedASTSplitter.splitDocument(doc);
```

**After:**
```javascript
// FIXED: Content-aware routing
const routedChunks = await this.contentAwareSplitterRouter.splitDocument(doc);
```

## Results and Benefits

### ✅ Structural Preservation
- **Markdown**: Headers and sections preserved
- **OpenAPI**: Operations and schemas properly separated
- **Configs**: Key-value organization maintained

### ✅ Improved RAG Quality
- More semantically meaningful chunks
- Better context preservation
- Reduced noise in embeddings
- More accurate retrieval

### ✅ Enhanced Metadata
Each chunk now includes:
- `chunk_type`: Type of content (e.g., `markdown_header`, `openapi_operation`)
- `splitting_method`: How it was split (e.g., `header_based`, `operation_centric`)
- Content-specific metadata (operation IDs, config keys, etc.)

### ✅ Fallback Safety
- Graceful degradation for unsupported formats
- Error handling with automatic fallback to generic splitting
- No breaking changes to existing functionality

## Testing Results

### Content Type Detection
- ✅ JavaScript → `code` (AST splitter)
- ✅ Markdown → `markdown` (header-aware)
- ✅ OpenAPI JSON → `openapi` (operation-centric)
- ✅ YAML → `yaml_config` (key-block)
- ✅ JSON → `json_config` (key-centric)

### Chunk Quality
- **Code files**: Semantic units preserved
- **Documentation**: Logical sections maintained
- **API specs**: Operations properly isolated
- **Configs**: Configuration blocks organized

## Files Modified

1. **`ContentAwareSplitterRouter.js`** - New smart routing system
2. **`repositoryProcessor.js`** - Updated to use content-aware routing
3. **`index.js`** - Export new router for external usage

## Usage Example

```javascript
const ContentAwareSplitterRouter = require('./ContentAwareSplitterRouter');

const router = new ContentAwareSplitterRouter({
  maxChunkSize: 2000,
  minChunkSize: 300,
  chunkOverlap: 150
});

// Automatically routes to appropriate splitter
const chunks = await router.splitDocument(document);

// Batch processing with routing stats
const allChunks = await router.splitDocuments(documents);
```

## Future Enhancements

### Additional Content Types
- **SQL files**: Query and schema-based splitting
- **Docker files**: Instruction-based splitting
- **Config templates**: Template-aware splitting

### Enhanced Detection
- Content analysis for ambiguous files
- Language-specific code splitting
- Multi-format document handling

### Quality Metrics
- Content-type-specific quality scoring
- Splitting effectiveness measurement
- Retrieval accuracy tracking

## Impact on RAG Pipeline

This implementation fixes the fundamental architectural flaw where all content was processed as code. Now:

1. **Better Embeddings**: Content-appropriate chunks create more meaningful embeddings
2. **Improved Retrieval**: Structured chunks enable more precise information retrieval
3. **Enhanced Context**: Preserved structure provides better context for LLM responses
4. **Reduced Noise**: Elimination of inappropriate code-based splitting reduces embedding noise

## Conclusion

The Content-Aware Splitter Router transforms the RAG pipeline from a "one-size-fits-all" approach to an intelligent, content-type-aware system. This ensures that each document type is processed with the most appropriate strategy, dramatically improving the quality and usefulness of the resulting knowledge base.

**Key Achievement**: Fixed the critical issue where Markdown, OpenAPI, and config files lost their inherent structure, enabling much more effective knowledge retrieval and generation.
