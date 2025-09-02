// CoreDocumentationIndexer.js - Handles core documentation indexing
"use strict";

/**
 * CoreDocumentationIndexer - Handles indexing of core system documentation
 * 
 * This module handles:
 * - Core documentation indexing orchestration
 * - API specification indexing
 * - Markdown documentation indexing
 * - Namespace management for core docs
 */
class CoreDocumentationIndexer {
  constructor(options = {}) {
    this.apiSpecProcessor = options.apiSpecProcessor;
    this.markdownDocumentationProcessor = options.markdownDocumentationProcessor;
    this.pinecone = options.pinecone;
  }

  /**
   * Index core documentation - delegates to specialized processors
   */
  async indexCoreDocsToPinecone(namespace = 'core-docs', clearFirst = false) {
    console.log(`[${new Date().toISOString()}] 🎯 CORE DOCS INDEXING: Starting comprehensive core documentation processing`);
    console.log(`[${new Date().toISOString()}] 🎯 Using specialized processors: API specs + markdown documentation`);
    
    try {
      // Clear namespace if requested
      if (clearFirst && this.pinecone) {
        console.log(`[${new Date().toISOString()}] 🧹 CORE DOCS: Clearing existing docs in namespace '${namespace}'`);
        try {
          const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
          await index.namespace(namespace).deleteAll();
          console.log(`[${new Date().toISOString()}] ✅ CORE DOCS: Successfully cleared namespace '${namespace}'`);
        } catch (clearError) {
          console.warn(`[${new Date().toISOString()}] ⚠️ CORE DOCS: Could not clear namespace:`, clearError.message);
        }
      }

      const results = {
        success: true,
        apiSpecResults: null,
        markdownResults: null,
        totalDocuments: 0,
        totalChunks: 0,
        namespace,
        processedAt: new Date().toISOString()
      };

      // Process API specifications using specialized processor
      try {
        console.log(`[${new Date().toISOString()}] 🔵 CORE DOCS: Processing API specifications...`);
        results.apiSpecResults = await this.apiSpecProcessor.processApiSpec(namespace);
        results.totalDocuments += results.apiSpecResults.documentsProcessed || 0;
        results.totalChunks += results.apiSpecResults.chunksGenerated || 0;
      } catch (apiError) {
        console.error(`[${new Date().toISOString()}] ❌ CORE DOCS: API spec processing failed:`, apiError.message);
        results.apiSpecError = apiError.message;
      }

      // Process markdown documentation using specialized processor
      try {
        console.log(`[${new Date().toISOString()}] 📚 CORE DOCS: Processing markdown documentation...`);
        results.markdownResults = await this.markdownDocumentationProcessor.processMarkdownDocumentation(namespace);
        results.totalDocuments += results.markdownResults.documentsProcessed || 0;
        results.totalChunks += results.markdownResults.chunksGenerated || 0;
      } catch (markdownError) {
        console.error(`[${new Date().toISOString()}] ❌ CORE DOCS: Markdown processing failed:`, markdownError.message);
        results.markdownError = markdownError.message;
      }

      console.log(`[${new Date().toISOString()}] ✅ CORE DOCS INDEXING COMPLETE: Processed ${results.totalDocuments} documents into ${results.totalChunks} chunks`);
      return results;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ CORE DOCS: Core documentation indexing failed:`, error.message);
      return {
        success: false,
        error: error.message,
        namespace,
        processedAt: new Date().toISOString()
      };
    }
  }
}

module.exports = CoreDocumentationIndexer;
