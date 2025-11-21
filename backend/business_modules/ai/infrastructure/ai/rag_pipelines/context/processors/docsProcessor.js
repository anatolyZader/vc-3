// DocsProcessor.js
"use strict";

const fs = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

// Support both PostgreSQL pgvector and Pinecone (legacy)
let PineconeStore;
try {
  ({ PineconeStore } = require('@langchain/pinecone'));
} catch (err) {
  console.warn(`[${new Date().toISOString()}] PineconeStore not available:`, err.message);
}

// Import MarkdownTextSplitter from the textsplitters package (no header-based splitting available)
let MarkdownTextSplitter;
try {
  MarkdownTextSplitter = require('@langchain/textsplitters').MarkdownTextSplitter;
  console.log(`[${new Date().toISOString()}] ✅ MarkdownTextSplitter loaded successfully from @langchain/textsplitters`);
} catch (error) {
  console.warn(`[${new Date().toISOString()}] ⚠️ MarkdownTextSplitter not available, using RecursiveCharacterTextSplitter as fallback`);
  MarkdownTextSplitter = null;
}

/**
 * Dedicated processor for Markdown documentation files
 * Handles system documentation, architecture docs, and business module docs
 */
class DocsProcessor {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pineconeLimiter = options.pineconeLimiter;
    this.vectorService = options.vectorService || options.pineconeService; // Support both
    
    // Backward compatibility aliases
    this.pineconeService = this.vectorService;
    this.pinecone = this.vectorService;
  }

  async _getVectorService() {
    if (this._vectorService) return this._vectorService;
    if (this._vectorServicePromise) {
      try {
        this._vectorService = await this._vectorServicePromise;
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DocsProcessor: Vector service initialization failed: ${err.message}`);
        this._vectorService = null;
      } finally {
        this._vectorServicePromise = null;
      }
      this.pinecone = this._vectorService; // Backward compatibility
    }
    return this._vectorService || this.vectorService;
  }

  // Backward compatibility method
  async _getPineconeService() {
    return this._getVectorService();
  }

  /**
   * Create an intelligent text splitter based on document content and language
   * Enhanced from DocumentProcessor for unified document processing
   */
  async createSmartSplitter(documents) {
    if (!documents || documents.length === 0) {
      return new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 250
      });
    }

    // Analyze document types to determine splitting strategy
    const hasCodeFiles = documents.some(doc => 
      doc.metadata?.source?.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|cs|php|rb|go|rs|swift)$/i)
    );
    
    const hasMarkdownFiles = documents.some(doc => 
      doc.metadata?.source?.match(/\.md$/i)
    );

    if (hasCodeFiles) {
      // Detect primary language
      const languages = documents
        .map(doc => doc.metadata?.source?.split('.').pop()?.toLowerCase())
        .filter(Boolean);
      
      const primaryLanguage = this.getMostCommonLanguage(languages);
      
      return new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 300,
        separators: this.getCodeAwareSeparators(primaryLanguage)
      });
    }

    if (hasMarkdownFiles) {
      return new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 250,
        separators: this.getCodeAwareSeparators('markdown')
      });
    }

    return new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 250
    });
  }

  /**
   * Get code-aware separators based on programming language
   * Enhanced from DocumentProcessor for unified document processing
   */
  getCodeAwareSeparators(language) {
    const separatorMap = {
      'javascript': [
        '\n\nclass ', '\nclass ',
        '\n\nfunction ', '\nfunction ',
        '\n\nconst ', '\nconst ',
        '\n\nlet ', '\nlet ',
        '\n\nvar ', '\nvar ',
        '\n\nexport ', '\nexport ',
        '\n\nimport ', '\nimport ',
        '\n\n// ', '\n// ',
        '\n\n', '\n', ' ', ''
      ],
      'typescript': [
        '\n\nclass ', '\nclass ',
        '\n\ninterface ', '\ninterface ',
        '\n\ntype ', '\ntype ',
        '\n\nfunction ', '\nfunction ',
        '\n\nconst ', '\nconst ',
        '\n\nlet ', '\nlet ',
        '\n\nexport ', '\nexport ',
        '\n\nimport ', '\nimport ',
        '\n\n// ', '\n// ',
        '\n\n', '\n', ' ', ''
      ],
      'python': [
        '\n\nclass ', '\nclass ',
        '\n\ndef ', '\ndef ',
        '\n\nasync def ', '\nasync def ',
        '\n\nif __name__', '\nif __name__',
        '\n\nfrom ', '\nfrom ',
        '\n\nimport ', '\nimport ',
        '\n\n# ', '\n# ',
        '\n\n', '\n', ' ', ''
      ],
      'java': [
        '\n\npublic class ', '\nclass ',
        '\n\npublic interface ', '\ninterface ',
        '\n\npublic ', '\npublic ',
        '\n\nprivate ', '\nprivate ',
        '\n\nprotected ', '\nprotected ',
        '\n\n// ', '\n// ',
        '\n\n', '\n', ' ', ''
      ],
      'markdown': [
        '\n## ', '\n### ', '\n#### ', '\n##### ',
        '\n\n', '\n', ' ', ''
      ],
      'default': ['\n\n', '\n', ' ', '']
    };

    const separators = separatorMap[language?.toLowerCase()] || separatorMap['default'];
    
    return separators;
  }

  /**
   * Helper method to determine most common language from file extensions
   * Enhanced from DocumentProcessor for unified document processing
   */
  getMostCommonLanguage(languages) {
    const languageCount = languages.reduce((acc, lang) => {
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});
    
    const mostCommon = Object.keys(languageCount).reduce((a, b) => 
      languageCount[a] > languageCount[b] ? a : b
    ) || 'javascript';
    
    return mostCommon;
  }

  /**
   * Process all markdown documentation files
   */
  async processMarkdownDocumentation(namespace = 'core-docs') {
    // Load all markdown files
    const markdownDocs = await this.loadMarkdownFiles();
    
    if (!markdownDocs || markdownDocs.length === 0) {
      return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
    }

    // Split markdown documents using intelligent chunking
    const splitDocuments = await this.splitMarkdownDocuments(markdownDocs);
    
    console.log(`[${new Date().toISOString()}] ✂️  MARKDOWN: Split ${markdownDocs.length} documents into ${splitDocuments.length} chunks`);

    // Store in vector database
    await this.storeMarkdownDocuments(splitDocuments, namespace);

    console.log(`[${new Date().toISOString()}] ✅ MARKDOWN PROCESSOR: Successfully processed ${markdownDocs.length} documentation files into ${splitDocuments.length} chunks`);

    return {
      success: true,
      documentsProcessed: markdownDocs.length,
      chunksGenerated: splitDocuments.length,
      namespace,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Load all markdown documentation files from system locations
   */
  async loadMarkdownFiles() {
    console.log(`[${new Date().toISOString()}] 📂 MARKDOWN: Scanning for documentation files...`);
    
    const markdownDocs = [];
    const backendRoot = path.resolve(__dirname, '../../../../../../..');
    
    try {
      // Load ROOT_DOCUMENTATION.md
      await this.loadRootDocumentation(backendRoot, markdownDocs);
      
      // Load ARCHITECTURE.md
      await this.loadArchitectureDocumentation(backendRoot, markdownDocs);
      
      // Load business module documentation
      await this.loadBusinessModuleDocumentation(backendRoot, markdownDocs);
      
      // Sort by priority (high priority processed first)
      markdownDocs.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return (priorityOrder[a.metadata.priority] || 3) - (priorityOrder[b.metadata.priority] || 3);
      });

      console.log(`[${new Date().toISOString()}] 📊 MARKDOWN: Found ${markdownDocs.length} documentation files total`);
      return markdownDocs;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ MARKDOWN: Error loading markdown files:`, error.message);
      return [];
    }
  }

  /**
   * Load root documentation file
   */
  async loadRootDocumentation(backendRoot, markdownDocs) {
    const rootDocPath = path.join(backendRoot, 'ROOT_DOCUMENTATION.md');
    
    try {
      const content = await fs.readFile(rootDocPath, 'utf8');
      markdownDocs.push({
        pageContent: content,
        metadata: {
          source: 'ROOT_DOCUMENTATION.md',
          type: 'root_documentation',
          category: 'system_documentation',
          priority: 'high',
          description: 'System overview and root documentation',
          processedAt: new Date().toISOString()
        }
      });
      console.log(`[${new Date().toISOString()}] 📄 MARKDOWN: Loaded root documentation`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ MARKDOWN: No root documentation found at ${rootDocPath}`);
    }
  }

  /**
   * Load architecture documentation file
   */
  async loadArchitectureDocumentation(backendRoot, markdownDocs) {
    const archDocPath = path.join(backendRoot, 'ARCHITECTURE.md');
    
    try {
      const content = await fs.readFile(archDocPath, 'utf8');
      markdownDocs.push({
        pageContent: content,
        metadata: {
          source: 'ARCHITECTURE.md',
          type: 'architecture_documentation',
          category: 'system_documentation',
          priority: 'high',
          description: 'System architecture and design patterns',
          processedAt: new Date().toISOString()
        }
      });
      console.log(`[${new Date().toISOString()}] 📄 MARKDOWN: Loaded architecture documentation`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ MARKDOWN: No architecture documentation found at ${archDocPath}`);
    }
  }

  /**
   * Load business module documentation files
   */
  async loadBusinessModuleDocumentation(backendRoot, markdownDocs) {
    const businessModulesPath = path.join(backendRoot, 'business_modules');
    
    try {
      const modules = await fs.readdir(businessModulesPath, { withFileTypes: true });
      
      for (const module of modules) {
        if (module.isDirectory()) {
          await this.loadModuleDocumentation(businessModulesPath, module.name, markdownDocs);
        }
      }
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ MARKDOWN: Could not access business modules directory:`, error.message);
    }
  }

  /**
   * Load documentation for a specific business module
   */
  async loadModuleDocumentation(businessModulesPath, moduleName, markdownDocs) {
    const modulePath = path.join(businessModulesPath, moduleName);
    const moduleDocPath = path.join(modulePath, `${moduleName}.md`);
    
    try {
      const content = await fs.readFile(moduleDocPath, 'utf8');
      markdownDocs.push({
        pageContent: content,
        metadata: {
          source: `business_modules/${moduleName}/${moduleName}.md`,
          type: 'module_documentation',
          category: 'business_module_documentation',
          module: moduleName,
          priority: 'medium',
          description: `Business module documentation for ${moduleName}`,
          processedAt: new Date().toISOString()
        }
      });
      console.log(`[${new Date().toISOString()}] 📄 MARKDOWN: Loaded ${moduleName} module documentation`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ MARKDOWN: No documentation found for module ${moduleName}`);
    }
  }

  /**
   * Split markdown documents using intelligent header-based chunking
   */
  async splitMarkdownDocuments(markdownDocs) {
    const allChunks = [];
    
    for (const doc of markdownDocs) {
      try {
        const chunks = await this.splitSingleMarkdownDocument(doc);
        allChunks.push(...chunks);
      } catch (error) {
        // Fallback to regular chunking
        const fallbackChunks = await this.fallbackSplitDocument(doc);
        allChunks.push(...fallbackChunks);
      }
    }

    return allChunks;
  }

  /**
   * Split a single markdown document using header-based strategy
   */
  async splitSingleMarkdownDocument(doc) {
    // Check if MarkdownTextSplitter is available
    if (!MarkdownTextSplitter) {
      console.log(`[${new Date().toISOString()}] ⚠️ MarkdownTextSplitter not available, using fallback for ${doc.metadata.source}`);
      return await this.fallbackSplitDocument(doc);
    }

    // Use MarkdownTextSplitter for markdown-aware splitting
    const markdownSplitter = new MarkdownTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200
    });

    try {
      const chunks = await markdownSplitter.splitDocuments([doc]);
      
      // Add chunk metadata
      return chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...doc.metadata,
          ...chunk.metadata,
          chunk_index: index,
          chunk_type: 'markdown',
          total_chunks: chunks.length,
          splitting_method: 'markdown_aware'
        }
      }));

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ MARKDOWN: Markdown splitting failed for ${doc.metadata.source}, using fallback`);
      return await this.fallbackSplitDocument(doc);
    }
  }

  /**
   * Further split large chunks using text splitter
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

  /**
   * Fallback splitting method for documents that can't use header-based splitting
   */
  async fallbackSplitDocument(doc) {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', '']
    });

    const chunks = await textSplitter.splitDocuments([doc]);
    
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...doc.metadata,
        chunk_index: index,
        chunk_type: 'fallback_text',
        total_chunks: chunks.length,
        splitting_method: 'text_based_fallback'
      }
    }));
  }

  /**
   * Store markdown documents in vector database
   */
  async storeMarkdownDocuments(documents, namespace) {
    console.log(`[${new Date().toISOString()}] 🗄️ MARKDOWN STORAGE: Storing ${documents.length} documentation chunks in namespace '${namespace}'`);
    const vectorService = await this._getVectorService();
    if (!vectorService) {
      console.warn(`[${new Date().toISOString()}] ⚠️ MARKDOWN: Vector service not available, skipping storage`);
      return { success: true, skipped: true, reason: 'vector_service_unavailable', chunksStored: 0 };
    }

    try {
      // Create vector store using the service
      const vectorStore = await vectorService.createVectorStore(this.embeddings, namespace);

      // Generate unique IDs using built-in sanitization
      const documentIds = documents.map((doc, index) => {
        const sanitizedSource = this.sanitizeId(doc.metadata.source || 'markdown');
        const sanitizedType = this.sanitizeId(doc.metadata.type || 'unknown');
        return `system_markdown_${sanitizedSource}_${sanitizedType}_chunk_${index}`;
      });

      // Store with rate limiting if available
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(async () => {
          await vectorStore.addDocuments(documents, { ids: documentIds });
        });
      } else {
        await vectorStore.addDocuments(documents, { ids: documentIds });
      }

      console.log(`[${new Date().toISOString()}] ✅ MARKDOWN STORAGE: Successfully stored ${documents.length} documentation chunks`);
      return { success: true, chunksStored: documents.length };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ MARKDOWN STORAGE: Error storing documents:`, error.message);
      throw error;
    }
  }

  /**
   * Sanitize string for use as identifiers
   */
  sanitizeId(input) {
    if (!input || typeof input !== 'string') {
      return 'unknown';
    }
    return input.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }
}

module.exports = DocsProcessor;
