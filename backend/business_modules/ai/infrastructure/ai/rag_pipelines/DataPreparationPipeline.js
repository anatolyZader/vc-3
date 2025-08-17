// DataPreparationPipeline.js
"use strict";

const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

/**
 * DataPreparationPipeline - Heavy RAG Operations
 * 
 * Responsibilities:
 * - Loading repository documents from GitHub
 * - Chunking documents for optimal processing
 * - Embedding documents into vector representations
 * - Storing embeddings in Pinecone vector database
 * - Managing temporary files and cleanup
 * 
 * This pipeline handles the heavy lifting operations that should be done once
 * per repository rather than on every query.
 */
class DataPreparationPipeline {
  constructor(options = {}) {
    // Store dependencies passed from the adapter
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    
    console.log(`[${new Date().toISOString()}] DataPreparationPipeline initialized`);
  }

  /**
   * Main entry point for processing a pushed repository
   */
  async processPushedRepo(userId, repoId, repoData) {
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing repo for user ${userId}: ${repoId}`);
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Received repoData structure:`, JSON.stringify(repoData, null, 2)); 
    
    // Emit starting status
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });

    // Index the core documentation first (API spec, markdown files)
    await this.indexCoreDocsToPinecone();

    try {
      // Validate repoData structure
      if (!repoData || !repoData.url || !repoData.branch) {
        throw new Error(`Invalid repository data: ${JSON.stringify(repoData)}`);
      }

      const { url, branch } = repoData;

      // Extract GitHub owner and repo name from URL
      const urlParts = url.split('/');
      const githubOwner = urlParts[urlParts.length - 2];
      const repoName = urlParts[urlParts.length - 1].replace('.git', '');

      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Extracted GitHub owner: ${githubOwner}, repo name: ${repoName}`);

      // Check if the repository is already processed
      const existingRepo = await this.findExistingRepo(userId, repoId, githubOwner, repoName);
      if (existingRepo) {
        console.log(`[${new Date().toISOString()}] Repository already processed, skipping: ${repoId}`);
        this.emitRagStatus('processing_skipped', {
          userId,
          repoId,
          reason: 'Repository already processed',
          timestamp: new Date().toISOString()
        });
        return {
          success: true,
          message: 'Repository already processed',
          repoId,
          userId
        };
      }

      // Clone the repository to a temporary location
      const tempDir = await this.cloneRepository(url, branch);

      // Load and process documents from the cloned repository
      const result = await this.loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName);

      // Cleanup: remove the cloned repository files
      await this.cleanupTempDir(tempDir);

      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing repository ${repoId}:`, error.message);
      
      // Emit error status
      this.emitRagStatus('processing_error', {
        userId,
        repoId,
        error: error.message,
        phase: 'repository_processing',
        processedAt: new Date().toISOString()
      });
      
      return {
        success: false,
        error: `Repository processing failed: ${error.message}`,
        userId: userId,
        repoId: repoId,
        processedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Index core documentation (API spec and markdown files) into Pinecone
   */
  async indexCoreDocsToPinecone() {
    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Starting core docs indexing into 'core-docs' namespace.`);
    
    // Load API spec
    const apiSpecChunk = await this.loadApiSpec('httpApiSpec.json');
    
    // Load markdown documentation files
    const markdownDocs = await this.loadMarkdownFiles();

    const documents = [];
    if (apiSpecChunk) {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] API Spec loaded successfully.`);
      // Parse JSON for targeted chunking
      let apiSpecJson;
      try {
        apiSpecJson = JSON.parse(apiSpecChunk.pageContent);
      } catch (e) {
        apiSpecJson = null;
      }
      
      if (apiSpecJson) {
        // Tags chunk
        if (Array.isArray(apiSpecJson.tags)) {
          const tagsText = apiSpecJson.tags.map(tag => `- ${tag.name}: ${tag.description}`).join('\n');
          documents.push({
            pageContent: `API Tags:\n${tagsText}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecTags' }
          });
        }
        // Endpoints chunk
        if (apiSpecJson.paths && typeof apiSpecJson.paths === 'object') {
          const endpointsText = Object.entries(apiSpecJson.paths).map(([path, methods]) => {
            return Object.entries(methods).map(([method, details]) => {
              const tagList = details.tags && details.tags.length ? ` [tags: ${details.tags.join(', ')}]` : '';
              return `- ${method.toUpperCase()} ${path}${tagList}`;
            }).join('\n');
          }).join('\n');
          documents.push({
            pageContent: `API Endpoints:\n${endpointsText}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecEndpoints' }
          });
        }
        // Info chunk
        if (apiSpecJson.info) {
          documents.push({
            pageContent: `API Info:\nTitle: ${apiSpecJson.info.title}\nDescription: ${apiSpecJson.info.description}\nVersion: ${apiSpecJson.info.version}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecInfo' }
          });
        }
      }
      // Add full spec as fallback
      documents.push({
        pageContent: apiSpecChunk.pageContent,
        metadata: { source: 'httpApiSpec.json', type: 'apiSpecFull' }
      });
    }

    // Add markdown documentation files
    if (markdownDocs.length > 0) {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] ${markdownDocs.length} Markdown docs loaded.`);
      documents.push(...markdownDocs);
    }

    if (documents.length === 0) {
      console.log(`[${new Date().toISOString()}] 🟡 [RAG-INDEX] No core documents found to index. Aborting.`);
      return;
    }

    // Use smart splitter for chunking (for markdown docs only)
    const docsToSplit = documents.filter(doc => 
      doc.metadata.type === 'root_documentation' || 
      doc.metadata.type === 'module_documentation' ||
      doc.metadata.type === 'architecture_documentation'
    );

    let splittedDocs = [];
    if (docsToSplit.length > 0) {
      const splitter = this.createSmartSplitter(docsToSplit);
      splittedDocs = await splitter.splitDocuments(docsToSplit);
    }
    
    // Add all API spec chunks (no further splitting)
    splittedDocs = splittedDocs.concat(documents.filter(doc => doc.metadata.source === 'httpApiSpec.json'));
    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Total documents after splitting: ${splittedDocs.length}`);

    // Generate unique IDs for Pinecone
    const repoId = 'core-docs';
    const documentIds = splittedDocs.map((doc, index) =>
      `system_${repoId}_${this.sanitizeId(doc.metadata.type || doc.metadata.source || 'unknown')}_chunk_${index}`
    );

    // Store in Pinecone in a GLOBAL namespace
    if (this.pinecone) {
        try {
            const coreDocsIndex = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
            const coreDocsVectorStore = new PineconeStore(this.embeddings, {
                pineconeIndex: coreDocsIndex,
                namespace: 'core-docs' // Using a fixed, global namespace
            });
            await coreDocsVectorStore.addDocuments(splittedDocs, { ids: documentIds });
            console.log(`[${new Date().toISOString()}] ✅ [RAG-INDEX] Successfully indexed ${splittedDocs.length} core doc chunks to Pinecone in 'core-docs' namespace.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ [RAG-INDEX] Error indexing core docs to Pinecone:`, error);
        }
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ [RAG-INDEX] Pinecone client not initialized, cannot index core docs.`);
    }
  }

  /**
   * Clone repository to temporary directory
   */
  async cloneRepository(url, branch) {
    const fs = require('fs').promises;
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Create temp directory
    const tempDir = path.join(__dirname, '../../../../../../temp', `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Created temp directory: ${tempDir}`);
      
      // Clone the repository
      const cloneCommand = `git clone --depth 1 --branch ${branch} ${url} ${tempDir}`;
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Cloning repository...`);
      
      await execAsync(cloneCommand, { timeout: 60000 }); // 60 second timeout
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Repository cloned successfully`);
      
      return tempDir;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error cloning repository:`, error.message);
      
      // Cleanup on failure
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Could not cleanup temp directory:`, cleanupError.message);
      }
      
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Load and process documents from cloned repository
   */
  async loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing documents from ${tempDir}`);
      
      // Use GitHub repo loader to process the cloned repository
      const loader = new GithubRepoLoader(tempDir, {
        branch: "main", // This will be ignored since we're loading from local directory
        recursive: true,
        unknown: "warn",
        maxConcurrency: 5, // Limit concurrent file processing
      });

      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Loading documents...`);
      const documents = await loader.load();
      
      if (documents.length === 0) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: No documents found in repository`);
        return {
          success: true,
          message: 'No documents found to process',
          documentsProcessed: 0,
          userId,
          repoId
        };
      }

      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Loaded ${documents.length} documents`);

      // Enhance metadata for better tracking
      const enhancedDocuments = documents.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          userId,
          repoId,
          githubOwner,
          repoName,
          processedAt: new Date().toISOString(),
          fileType: this.getFileType(doc.metadata.source || '')
        }
      }));

      // Create smart splitter based on document types
      const splitter = this.createSmartSplitter(enhancedDocuments);
      
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Splitting documents...`);
      const splitDocs = await splitter.splitDocuments(enhancedDocuments);
      
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Split into ${splitDocs.length} chunks`);

      // Generate unique IDs for each chunk
      const documentIds = splitDocs.map((doc, index) => {
        const sourceFile = doc.metadata.source || 'unknown';
        const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
        return `${userId}_${repoId}_${sanitizedSource}_chunk_${index}`;
      });

      // Store in Pinecone with user-specific namespace
      if (this.pinecone) {
        try {
          const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
          const vectorStore = new PineconeStore(this.embeddings, {
            pineconeIndex: index,
            namespace: userId // User-specific namespace
          });

          // Use bottleneck limiter for Pinecone operations
          if (this.pineconeLimiter) {
            await this.pineconeLimiter.schedule(async () => {
              await vectorStore.addDocuments(splitDocs, { ids: documentIds });
            });
          } else {
            await vectorStore.addDocuments(splitDocs, { ids: documentIds });
          }

          console.log(`[${new Date().toISOString()}] ✅ DATA-PREP: Successfully indexed ${splitDocs.length} document chunks to Pinecone`);

          this.emitRagStatus('processing_completed', {
            userId,
            repoId,
            documentsProcessed: documents.length,
            chunksGenerated: splitDocs.length,
            githubOwner,
            repoName,
            timestamp: new Date().toISOString()
          });

          return {
            success: true,
            message: 'Repository processed successfully',
            documentsProcessed: documents.length,
            chunksGenerated: splitDocs.length,
            userId,
            repoId,
            githubOwner,
            repoName,
            processedAt: new Date().toISOString()
          };

        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error storing in Pinecone:`, error.message);
          throw error;
        }
      } else {
        throw new Error('Pinecone client not available');
      }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error processing repository documents:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up temporary directory
   */
  async cleanupTempDir(tempDir) {
    const fs = require('fs').promises;
    
    try {
      await fs.rmdir(tempDir, { recursive: true });
      console.log(`[${new Date().toISOString()}] 🧹 DATA-PREP: Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Could not cleanup temp directory:`, error.message);
    }
  }

  /**
   * Check if repository is already processed
   */
  async findExistingRepo(userId, repoId, githubOwner, repoName) {
    // For now, we'll assume repositories are not duplicate processed
    // This could be enhanced to check Pinecone metadata or a database
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Checking for existing repo: ${githubOwner}/${repoName}`);
    
    // TODO: Implement actual duplicate detection
    // This could query Pinecone metadata or check a database
    return false;
  }

  // Helper methods from original adapter

  /**
   * Helper to load JSON spec file from backend root
   */
  async loadApiSpec(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backendRoot = path.resolve(__dirname, '../../../../..');
    const absPath = path.resolve(backendRoot, filePath);
    try {
      const content = await fs.promises.readFile(absPath, 'utf8');
      // Optionally parse and pretty-print JSON
      let prettyContent = content;
      try {
        const json = JSON.parse(content);
        prettyContent = JSON.stringify(json, null, 2);
      } catch (e) {}
      return {
        pageContent: prettyContent,
        metadata: { source: 'httpApiSpec.json', type: 'apiSpec' }
      };
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Could not load API spec file at ${absPath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Helper to load markdown files from root directory and business modules
   */
  async loadMarkdownFiles() {
    const fs = require('fs');
    const path = require('path');
    const markdownDocs = [];
    
    try {
      const backendRoot = path.resolve(__dirname, '../../../../..');
      
      // Load ROOT_DOCUMENTATION.md from backend root if it exists
      const rootDocPath = path.join(backendRoot, 'ROOT_DOCUMENTATION.md');
      try {
        const rootDocContent = await fs.promises.readFile(rootDocPath, 'utf8');
        markdownDocs.push({
          pageContent: rootDocContent,
          metadata: { 
            source: 'ROOT_DOCUMENTATION.md', 
            type: 'root_documentation',
            priority: 'high'
          }
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Loaded root documentation file`);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] [DEBUG] No root documentation file found at ${rootDocPath}`);
      }

      // Load ARCHITECTURE.md from backend root if it exists
      const archDocPath = path.join(backendRoot, 'ARCHITECTURE.md');
      try {
        const archDocContent = await fs.promises.readFile(archDocPath, 'utf8');
        markdownDocs.push({
          pageContent: archDocContent,
          metadata: { 
            source: 'ARCHITECTURE.md', 
            type: 'architecture_documentation',
            priority: 'high'
          }
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Loaded architecture documentation file`);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] [DEBUG] No architecture documentation file found at ${archDocPath}`);
      }

      // Load markdown files from business modules
      const businessModulesPath = path.join(backendRoot, 'business_modules');
      
      try {
        const modules = await fs.promises.readdir(businessModulesPath, { withFileTypes: true });
        
        for (const module of modules) {
          if (module.isDirectory()) {
            const modulePath = path.join(businessModulesPath, module.name);
            const moduleMarkdownPath = path.join(modulePath, `${module.name}.md`);
            
            try {
              const moduleContent = await fs.promises.readFile(moduleMarkdownPath, 'utf8');
              markdownDocs.push({
                pageContent: moduleContent,
                metadata: { 
                  source: `business_modules/${module.name}/${module.name}.md`, 
                  type: 'module_documentation',
                  module: module.name,
                  priority: 'medium'
                }
              });
              console.log(`[${new Date().toISOString()}] [DEBUG] Loaded ${module.name} module documentation`);
            } catch (err) {
              console.log(`[${new Date().toISOString()}] [DEBUG] No documentation file found for module ${module.name} at ${moduleMarkdownPath}`);
            }
          }
        }
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] Could not read business modules directory: ${err.message}`);
      }

      // Sort by priority (high priority first)
      markdownDocs.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.metadata.priority] - priorityOrder[b.metadata.priority];
      });

      console.log(`[${new Date().toISOString()}] [DEBUG] Loaded ${markdownDocs.length} total markdown documentation files`);
      return markdownDocs;
      
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error loading markdown files: ${err.message}`);
      return [];
    }
  }

  /**
   * Helper method to determine file type from file path
   */
  getFileType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    const codeExtensions = {
      js: 'JavaScript',
      jsx: 'React',
      ts: 'TypeScript',
      tsx: 'React TypeScript',
      py: 'Python',
      java: 'Java',
      rb: 'Ruby',
      php: 'PHP',
      c: 'C',
      cpp: 'C++',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      kt: 'Kotlin',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      md: 'Markdown',
      sql: 'SQL',
      sh: 'Shell',
      bat: 'Batch',
      ps1: 'PowerShell',
      yaml: 'YAML',
      yml: 'YAML',
      xml: 'XML'
    };

    return codeExtensions[extension] || 'Unknown';
  }

  /**
   * Helper method to sanitize document IDs
   */
  sanitizeId(input) {
    // Remove special characters and truncate if necessary
    return input.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }

  /**
   * Helper method to emit RAG status updates for monitoring
   */
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', {
          component: 'DataPreparationPipeline',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('ragStatusUpdate', {
          component: 'DataPreparationPipeline',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }

  /**
   * Helper method to create an appropriate text splitter based on document content
   */
  createSmartSplitter(documents) {
    // Default splitter settings
    const chunkSize = 1500; // Larger chunks for fewer requests
    const chunkOverlap = 250; // More overlap for better context

    // Analyze documents to determine predominant language
    const languageCount = {};

    documents.forEach(doc => {
      const extension = (doc.metadata.source || '').split('.').pop().toLowerCase();
      if (!extension) return;

      if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) languageCount.javascript = (languageCount.javascript || 0) + 1;
      else if (['py'].includes(extension)) languageCount.python = (languageCount.python || 0) + 1;
      else if (['java'].includes(extension)) languageCount.java = (languageCount.java || 0) + 1;
      else if (['rb'].includes(extension)) languageCount.ruby = (languageCount.ruby || 0) + 1;
      else if (['go'].includes(extension)) languageCount.golang = (languageCount.golang || 0) + 1;
      else if (['php'].includes(extension)) languageCount.php = (languageCount.php || 0) + 1;
      else if (['c', 'cpp', 'h', 'hpp'].includes(extension)) languageCount.cpp = (languageCount.cpp || 0) + 1;
      else if (['cs'].includes(extension)) languageCount.csharp = (languageCount.csharp || 0) + 1;
      else if (['rs'].includes(extension)) languageCount.rust = (languageCount.rust || 0) + 1;
    });

    // Find the most common language
    let predominantLanguage = 'javascript'; // Default
    let maxCount = 0;

    Object.entries(languageCount).forEach(([lang, count]) => {
      if (count > maxCount) {
        predominantLanguage = lang;
        maxCount = count;
      }
    });

    // Map to LangChain language string
    const langMap = {
      javascript: "js",
      python: "python",
      java: "java",
      ruby: "ruby",
      golang: "go",
      php: "php",
      cpp: "cpp",
      csharp: "csharp",
      rust: "rust"
    };

    const language = langMap[predominantLanguage] || "js";

    console.log(`[${new Date().toISOString()}] Using ${predominantLanguage} code splitter for document processing`);

    // Create a language-specific splitter using the new API
    return RecursiveCharacterTextSplitter.fromLanguage(language, {
      chunkSize,
      chunkOverlap
    });
  }
}

module.exports = DataPreparationPipeline;
