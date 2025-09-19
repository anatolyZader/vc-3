// ContentAwareSplitterRouter.js
"use strict";

const EnhancedASTCodeSplitter = require('./EnhancedASTCodeSplitter');
const DocsProcessor = require('./markdownDocumentationProcessor');
const TokenBasedSplitter = require('./TokenBasedSplitter');
const CodePreprocessor = require('./CodePreprocessor');
const TextPreprocessor = require('./TextPreprocessor');
const ChunkPostprocessor = require('./ChunkPostprocessor');
const { RecursiveCharacterTextSplitter, MarkdownTextSplitter } = require('langchain/text_splitter');

/**
 * Content-Type-Aware Splitter Router with Comprehensive Preprocessing
 * Routes documents to appropriate splitters and applies preprocessing/postprocessing
 * Fixes content routing + adds quality preprocessing for better RAG results
 */
class ContentAwareSplitterRouter {
  constructor(options = {}) {
    this.options = options;
    
    // Initialize preprocessors
    this.codePreprocessor = new CodePreprocessor();
    this.textPreprocessor = new TextPreprocessor();
    this.chunkPostprocessor = new ChunkPostprocessor();
    
    // Initialize token-based splitter for accurate measurements
    this.tokenSplitter = new TokenBasedSplitter({
      maxTokens: options.maxTokens || 1400,        // Token-based limit (more accurate)
      minTokens: options.minTokens || 120,         // Minimum meaningful tokens
      overlapTokens: options.overlapTokens || 180, // Token overlap for context
      encodingModel: options.encodingModel || 'cl100k_base'
    });
    
    // Initialize specialized splitters with token-aware limits
    this.astCodeSplitter = new EnhancedASTCodeSplitter({
      maxTokens: this.tokenSplitter.maxTokens,
      minTokens: this.tokenSplitter.minTokens,
      overlapTokens: this.tokenSplitter.overlapTokens,
      tokenSplitter: this.tokenSplitter  // Pass token splitter for accurate measurements
    });
    
    this.markdownProcessor = new DocsProcessor();
    
    console.log(`[${new Date().toISOString()}] 🚦 CONTENT ROUTER: Initialized with TOKEN-BASED measurements + PREPROCESSING`);
    console.log(`[${new Date().toISOString()}] 🎯 TOKEN LIMITS: ${this.tokenSplitter.maxTokens}/${this.tokenSplitter.minTokens} tokens, ${this.tokenSplitter.overlapTokens} overlap`);
  }

  /**
   * Main entry point: Route documents with preprocessing and postprocessing
   */
  async splitDocument(document) {
    const contentType = this.detectContentType(document);
    const source = document.metadata?.source || 'unknown';
    
    console.log(`[${new Date().toISOString()}] 🎯 PREPROCESSING + ROUTING: ${source} → ${contentType}`);

    try {
      // Step 1: Preprocess the document content
      const preprocessedDoc = await this.preprocessDocument(document, contentType);
      
      // Step 2: Route to appropriate splitter
      const chunks = await this.routeToSplitter(preprocessedDoc, contentType);
      
      // Step 3: Postprocess chunks for better retrieval
      const enhancedChunks = await this.chunkPostprocessor.postprocessChunks(chunks, preprocessedDoc);
      
      console.log(`[${new Date().toISOString()}] ✅ COMPLETE PIPELINE: ${source} → ${enhancedChunks.length} enhanced chunks`);
      return enhancedChunks;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ ROUTING ERROR: ${source}:`, error.message);
      return this.fallbackSplit(document);
    }
  }

  /**
   * Step 1: Preprocess document based on content type
   */
  async preprocessDocument(document, contentType) {
    const source = document.metadata?.source || 'unknown';
    
    try {
      if (contentType === 'code') {
        const result = await this.codePreprocessor.preprocessCodeFile(
          document.pageContent, 
          source, 
          document.metadata
        );
        
        return {
          pageContent: result.content,
          metadata: {
            ...document.metadata,
            ...result.metadata,
            preprocessing_applied: result.preprocessingApplied
          }
        };
        
      } else if (contentType === 'markdown' || contentType === 'documentation' || contentType === 'generic') {
        const result = await this.textPreprocessor.preprocessTextFile(
          document.pageContent, 
          source, 
          document.metadata
        );
        
        return {
          pageContent: result.content,
          metadata: {
            ...document.metadata,
            ...result.metadata,
            preprocessing_applied: result.preprocessingApplied
          }
        };
        
      } else {
        // For other content types, minimal preprocessing
        return {
          ...document,
          metadata: {
            ...document.metadata,
            preprocessing_applied: { minimal: true }
          }
        };
      }
      
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ PREPROCESSING WARNING: ${source}:`, error.message);
      return document; // Return original if preprocessing fails
    }
  }

  /**
   * Step 2: Route to appropriate splitter
   */
  async routeToSplitter(document, contentType) {
    switch (contentType) {
      case 'code':
        return await this.splitCodeDocument(document);
        
      case 'markdown':
        return await this.splitMarkdownDocument(document);
        
      case 'openapi':
        return await this.splitOpenAPIDocument(document);
        
      case 'yaml_config':
        return await this.splitYAMLConfigDocument(document);
        
      case 'json_config':
        return await this.splitJSONConfigDocument(document);
        
      case 'json_schema':
        return await this.splitJSONSchemaDocument(document);
        
      case 'documentation':
        return await this.splitDocumentationFile(document);
        
      case 'generic':
      default:
        return await this.splitGenericDocument(document);
    }
  }

  /**
   * Detect content type for routing decisions
   */
  detectContentType(document) {
    const source = document.metadata?.source || '';
    const content = document.pageContent || document.content || '';
    const extension = this.getFileExtension(source).toLowerCase();
    const basename = this.getBasename(source).toLowerCase();

    // Code files - use AST splitter
    if (this.isCodeFile(extension)) {
      return 'code';
    }

    // Markdown files
    if (extension === '.md' || extension === '.markdown') {
      return 'markdown';
    }

    // OpenAPI/Swagger specifications
    if (this.isOpenAPIFile(source, content)) {
      return 'openapi';
    }

    // JSON Schema files
    if (this.isJSONSchemaFile(source, content)) {
      return 'json_schema';
    }

    // YAML configuration files
    if (extension === '.yml' || extension === '.yaml') {
      return 'yaml_config';
    }

    // JSON configuration files
    if (extension === '.json' && !this.isOpenAPIFile(source, content) && !this.isJSONSchemaFile(source, content)) {
      return 'json_config';
    }

    // Documentation files
    if (this.isDocumentationFile(extension, basename)) {
      return 'documentation';
    }

    return 'generic';
  }

  /**
   * Check if file is a code file that should use AST splitter
   */
  isCodeFile(extension) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',  // JavaScript/TypeScript
      '.py', '.pyx', '.pyi',                        // Python
      '.java', '.kt', '.scala',                     // JVM languages
      '.go', '.rs', '.cpp', '.c', '.h', '.hpp',     // Systems languages
      '.cs', '.vb', '.fs',                          // .NET languages
      '.php', '.rb', '.swift', '.dart'              // Other languages
    ];
    return codeExtensions.includes(extension);
  }

  /**
   * Check if file is an OpenAPI specification
   */
  isOpenAPIFile(source, content) {
    const filename = this.getBasename(source).toLowerCase();
    
    // Check filename patterns
    if (filename.includes('openapi') || 
        filename.includes('swagger') ||
        filename.includes('api-spec') ||
        filename.includes('apispec')) {
      return true;
    }

    // Check content for OpenAPI indicators
    if (content.includes('openapi:') || 
        content.includes('"openapi"') ||
        content.includes('swagger:') ||
        content.includes('"swagger"') ||
        content.includes('/paths/') ||
        content.includes('"paths"')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a JSON Schema
   */
  isJSONSchemaFile(source, content) {
    const filename = this.getBasename(source).toLowerCase();
    
    // Check filename patterns
    if (filename.includes('schema') || filename.endsWith('.schema.json')) {
      return true;
    }

    // Check content for JSON Schema indicators
    if (content.includes('"$schema"') ||
        content.includes('"type"') && content.includes('"properties"') ||
        content.includes('json-schema.org')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a documentation file
   */
  isDocumentationFile(extension, basename) {
    const docExtensions = ['.txt', '.rst', '.adoc', '.org'];
    const docFilenames = ['readme', 'changelog', 'license', 'contributing'];
    
    return docExtensions.includes(extension) || 
           docFilenames.some(name => basename.includes(name));
  }

  /**
   * Split code documents using Enhanced AST splitter
   */
  async splitCodeDocument(document) {
    console.log(`[${new Date().toISOString()}] 💻 CODE SPLITTING: Using AST splitter`);
    return await this.astCodeSplitter.splitDocument(document);
  }

  /**
   * Split markdown documents using header-aware splitter
   */
  async splitMarkdownDocument(document) {
    console.log(`[${new Date().toISOString()}] 📝 MARKDOWN SPLITTING: Using header-aware splitter`);
    
    // Use markdown splitter that understands structure
    const markdownSplitter = new MarkdownTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
    });

    try {
      const chunks = await markdownSplitter.splitDocuments([document]);
      
      // Add chunk metadata
      return chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...document.metadata,
          ...chunk.metadata,
          chunk_index: index,
          chunk_type: 'markdown_section',
          total_chunks: chunks.length,
          splitting_method: 'markdown_structure_aware'
        }
      }));

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ MARKDOWN: Structure splitting failed, using fallback`);
      return await this.splitDocumentationFile(document);
    }
  }

  /**
   * Split OpenAPI/Swagger documents by operations
   */
  async splitOpenAPIDocument(document) {
    console.log(`[${new Date().toISOString()}] 🔌 OPENAPI SPLITTING: Using operation-centric splitter`);
    
    const content = document.pageContent || document.content || '';
    
    try {
      const spec = JSON.parse(content);
      const chunks = [];

      // Split by API operations if paths exist
      if (spec.paths) {
        for (const [path, pathItem] of Object.entries(spec.paths)) {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (typeof operation === 'object' && operation !== null) {
              const operationChunk = {
                pageContent: JSON.stringify({
                  path,
                  method: method.toUpperCase(),
                  ...operation
                }, null, 2),
                metadata: {
                  ...document.metadata,
                  openapi_path: path,
                  openapi_method: method.toUpperCase(),
                  openapi_operation_id: operation.operationId || `${method}-${path}`,
                  chunk_type: 'openapi_operation',
                  splitting_method: 'openapi_operation_centric'
                }
              };
              chunks.push(operationChunk);
            }
          }
        }
      }

      // Split components (schemas, parameters, etc.)
      if (spec.components) {
        for (const [componentType, components] of Object.entries(spec.components)) {
          for (const [componentName, componentDef] of Object.entries(components)) {
            const componentChunk = {
              pageContent: JSON.stringify({
                type: componentType,
                name: componentName,
                definition: componentDef
              }, null, 2),
              metadata: {
                ...document.metadata,
                openapi_component_type: componentType,
                openapi_component_name: componentName,
                chunk_type: 'openapi_component',
                splitting_method: 'openapi_component_centric'
              }
            };
            chunks.push(componentChunk);
          }
        }
      }

      // If no specific structure found, fall back to generic splitting
      if (chunks.length === 0) {
        return await this.splitGenericDocument(document);
      }

      console.log(`[${new Date().toISOString()}] ✅ OPENAPI: Split into ${chunks.length} operation/component chunks`);
      return chunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ OPENAPI: JSON parse failed, using generic splitting`);
      return await this.splitGenericDocument(document);
    }
  }

  /**
   * Split YAML configuration files by top-level keys
   */
  async splitYAMLConfigDocument(document) {
    console.log(`[${new Date().toISOString()}] ⚙️ YAML CONFIG SPLITTING: Using key-block splitter`);
    
    const content = document.pageContent || document.content || '';
    const lines = content.split('\n');
    const chunks = [];
    let currentBlock = [];
    let currentKey = null;
    let indentLevel = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments in key detection
      if (!trimmed || trimmed.startsWith('#')) {
        currentBlock.push(line);
        continue;
      }

      // Detect top-level keys (no indentation)
      const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):(\s|$)/);
      if (match && !line.startsWith(' ') && !line.startsWith('\t')) {
        // Save previous block
        if (currentBlock.length > 0 && currentKey) {
          chunks.push(this.createYAMLChunk(currentBlock.join('\n'), currentKey, document));
        }
        
        // Start new block
        currentKey = match[1];
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }

    // Add final block
    if (currentBlock.length > 0 && currentKey) {
      chunks.push(this.createYAMLChunk(currentBlock.join('\n'), currentKey, document));
    }

    // If no structure found, use generic splitting
    if (chunks.length === 0) {
      return await this.splitGenericDocument(document);
    }

    console.log(`[${new Date().toISOString()}] ✅ YAML: Split into ${chunks.length} key-block chunks`);
    return chunks;
  }

  /**
   * Split JSON configuration files by top-level keys
   */
  async splitJSONConfigDocument(document) {
    console.log(`[${new Date().toISOString()}] ⚙️ JSON CONFIG SPLITTING: Using key-block splitter`);
    
    const content = document.pageContent || document.content || '';
    
    try {
      const config = JSON.parse(content);
      const chunks = [];

      if (typeof config === 'object' && config !== null) {
        for (const [key, value] of Object.entries(config)) {
          const keyChunk = {
            pageContent: JSON.stringify({ [key]: value }, null, 2),
            metadata: {
              ...document.metadata,
              config_key: key,
              chunk_type: 'json_config_key',
              splitting_method: 'json_key_centric'
            }
          };
          chunks.push(keyChunk);
        }
      }

      if (chunks.length === 0) {
        return await this.splitGenericDocument(document);
      }

      console.log(`[${new Date().toISOString()}] ✅ JSON CONFIG: Split into ${chunks.length} key chunks`);
      return chunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ JSON CONFIG: Parse failed, using generic splitting`);
      return await this.splitGenericDocument(document);
    }
  }

  /**
   * Split JSON Schema files by schema definitions
   */
  async splitJSONSchemaDocument(document) {
    console.log(`[${new Date().toISOString()}] 📋 JSON SCHEMA SPLITTING: Using schema-definition splitter`);
    
    const content = document.pageContent || document.content || '';
    
    try {
      const schema = JSON.parse(content);
      const chunks = [];

      // Split by definitions or properties
      if (schema.definitions) {
        for (const [defName, defSchema] of Object.entries(schema.definitions)) {
          const defChunk = {
            pageContent: JSON.stringify({ [defName]: defSchema }, null, 2),
            metadata: {
              ...document.metadata,
              schema_definition: defName,
              chunk_type: 'json_schema_definition',
              splitting_method: 'schema_definition_centric'
            }
          };
          chunks.push(defChunk);
        }
      }

      // Split by properties if it's a property-heavy schema
      if (schema.properties && Object.keys(schema.properties).length > 5) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const propChunk = {
            pageContent: JSON.stringify({ [propName]: propSchema }, null, 2),
            metadata: {
              ...document.metadata,
              schema_property: propName,
              chunk_type: 'json_schema_property',
              splitting_method: 'schema_property_centric'
            }
          };
          chunks.push(propChunk);
        }
      }

      if (chunks.length === 0) {
        return await this.splitGenericDocument(document);
      }

      console.log(`[${new Date().toISOString()}] ✅ JSON SCHEMA: Split into ${chunks.length} definition chunks`);
      return chunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ JSON SCHEMA: Parse failed, using generic splitting`);
      return await this.splitGenericDocument(document);
    }
  }

  /**
   * Split documentation files using paragraph-aware splitter
   */
  async splitDocumentationFile(document) {
    console.log(`[${new Date().toISOString()}] 📖 DOCUMENTATION SPLITTING: Using paragraph-aware splitter`);
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''], // Paragraph and sentence aware
      keepSeparator: true
    });

    const chunks = await splitter.splitDocuments([document]);
    
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...document.metadata,
        chunk_index: index,
        chunk_type: 'documentation_paragraph',
        total_chunks: chunks.length,
        splitting_method: 'paragraph_aware'
      }
    }));
  }

  /**
   * Generic document splitting for unknown/unsupported file types
   */
  async splitGenericDocument(document) {
    console.log(`[${new Date().toISOString()}] 📄 GENERIC SPLITTING: Using standard text splitter`);
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200,
      chunkOverlap: 150,
      separators: ['\n\n', '\n', ' ', '']
    });

    const chunks = await splitter.splitDocuments([document]);
    
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...document.metadata,
        chunk_index: index,
        chunk_type: 'generic_text',
        total_chunks: chunks.length,
        splitting_method: 'generic_text_based'
      }
    }));
  }

  /**
   * Helper methods
   */
  async furtherSplitLargeChunk(chunk) {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', '']
    });

    const subChunks = await textSplitter.splitDocuments([chunk]);
    return subChunks.map((subChunk, index) => ({
      ...subChunk,
      metadata: {
        ...chunk.metadata,
        sub_chunk_index: index,
        sub_chunk_type: 'text_overflow'
      }
    }));
  }

  getFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  getBasename(filepath) {
    if (!filepath) return '';
    const lastSlash = Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\'));
    const filename = lastSlash === -1 ? filepath : filepath.substring(lastSlash + 1);
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.substring(0, lastDot);
  }

  createYAMLChunk(content, key, document) {
    return {
      pageContent: content,
      metadata: {
        ...document.metadata,
        yaml_key: key,
        chunk_type: 'yaml_config_block',
        splitting_method: 'yaml_key_block_centric'
      }
    };
  }

  /**
   * Fallback splitting method when content-aware routing fails
   * Uses the most basic and reliable text splitting approach
   */
  async fallbackSplit(document) {
    console.log(`[${new Date().toISOString()}] 🚨 FALLBACK SPLITTING: Using emergency text splitter for ${document.metadata?.source || 'unknown'}`);
    
    try {
      // Use the most basic RecursiveCharacterTextSplitter as last resort
      const fallbackSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,  // Smaller chunks for safety
        chunkOverlap: 100,
        separators: ['\n\n', '\n', ' ', '']
      });

      const chunks = await fallbackSplitter.splitDocuments([document]);
      
      return chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...document.metadata,
          chunk_index: index,
          chunk_type: 'fallback_text',
          total_chunks: chunks.length,
          splitting_method: 'fallback_emergency',
          fallback_reason: 'content_aware_routing_failed'
        }
      }));

    } catch (fallbackError) {
      console.error(`[${new Date().toISOString()}] ❌ FALLBACK SPLITTING FAILED: ${document.metadata?.source}:`, fallbackError.message);
      
      // Ultimate fallback: return the document as a single chunk
      return [{
        pageContent: document.pageContent || document.content || '',
        metadata: {
          ...document.metadata,
          chunk_index: 0,
          chunk_type: 'single_document',
          total_chunks: 1,
          splitting_method: 'no_splitting_applied',
          fallback_reason: 'all_splitting_methods_failed'
        }
      }];
    }
  }

  /**
   * Batch split multiple documents
   */
  async splitDocuments(documents) {
    console.log(`[${new Date().toISOString()}] 🚦 BATCH ROUTING: Processing ${documents.length} documents`);
    
    const allChunks = [];
    const stats = {
      code: 0,
      markdown: 0,
      openapi: 0,
      yaml_config: 0,
      json_config: 0,
      json_schema: 0,
      documentation: 0,
      generic: 0
    };

    for (const document of documents) {
      try {
        const contentType = this.detectContentType(document);
        stats[contentType] = (stats[contentType] || 0) + 1;
        
        const chunks = await this.splitDocument(document);
        allChunks.push(...chunks);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ ROUTING ERROR: ${document.metadata?.source}:`, error.message);
        // Try generic splitting as last resort
        try {
          const fallbackChunks = await this.splitGenericDocument(document);
          allChunks.push(...fallbackChunks);
          stats.generic = (stats.generic || 0) + 1;
        } catch (fallbackError) {
          console.error(`[${new Date().toISOString()}] ❌ FALLBACK FAILED: ${document.metadata?.source}:`, fallbackError.message);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] 📊 ROUTING STATS:`, stats);
    console.log(`[${new Date().toISOString()}] ✅ BATCH COMPLETE: ${documents.length} documents → ${allChunks.length} chunks`);
    
    return allChunks;
  }
}

module.exports = ContentAwareSplitterRouter;
