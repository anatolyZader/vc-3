// DataPreparationPipeline.js
"use strict";

const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const SemanticPreprocessor = require('./SemanticPreprocessor');
const ASTCodeSplitter = require('./ASTCodeSplitter');
const path = require('path');
const fs = require('fs');

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
    
    // Initialize semantic preprocessor
    this.semanticPreprocessor = new SemanticPreprocessor();
    
    // Initialize AST-based code splitter
    this.astCodeSplitter = new ASTCodeSplitter({
      maxChunkSize: options.maxChunkSize || 2000,
      includeComments: true,
      includeImports: true
    });
    
    // Load ubiquitous language dictionary
    this.ubiquitousLanguage = this.loadUbiquitousLanguage();
    
    console.log(`[${new Date().toISOString()}] DataPreparationPipeline initialized with semantic preprocessing, AST-based splitting, and ubiquitous language dictionary`);
  }

  /**
   * Load EventStorm.me ubiquitous language dictionary
   */
  loadUbiquitousLanguage() {
    try {
      const dictPath = path.join(__dirname, 'ubiqLangDict.json');
      const dictContent = fs.readFileSync(dictPath, 'utf8');
      const dictionary = JSON.parse(dictContent);
      console.log(`[${new Date().toISOString()}] 📚 UBIQ-LANG: Loaded dictionary with ${Object.keys(dictionary.businessModules).length} business modules`);
      return dictionary;
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ UBIQ-LANG: Failed to load ubiquitous language dictionary:`, error.message);
      return null;
    }
  }

  /**
   * Enhance document with ubiquitous language context
   */
  enhanceWithUbiquitousLanguage(document) {
    if (!this.ubiquitousLanguage) {
      return document;
    }

    const content = document.pageContent.toLowerCase();
    const source = document.metadata.source || '';
    
    // Detect business module context
    const detectedModule = this.detectBusinessModule(content, source);
    
    // Add domain-specific metadata
    const enhancedMetadata = {
      ...document.metadata,
      ubiq_business_module: detectedModule,
      ubiq_bounded_context: this.getBoundedContext(detectedModule),
      ubiq_domain_events: this.getRelevantDomainEvents(detectedModule),
      ubiq_terminology: this.extractRelevantTerms(content)
    };

    // Add contextual annotation
    const contextualAnnotation = this.generateContextualAnnotation(detectedModule, content);
    const enhancedContent = contextualAnnotation + document.pageContent;

    console.log(`[${new Date().toISOString()}] 📚 UBIQ-LANG: Enhanced document with module '${detectedModule}' context`);

    return {
      pageContent: enhancedContent,
      metadata: enhancedMetadata
    };
  }

  /**
   * Detect which business module this document belongs to
   */
  detectBusinessModule(content, source) {
    const modules = this.ubiquitousLanguage.businessModules;
    
    // Check source path first - more reliable than content analysis
    for (const [moduleName, moduleData] of Object.entries(modules)) {
      // Check for exact module name in path
      if (source.toLowerCase().includes(`/${moduleName}/`) || 
          source.toLowerCase().includes(`\\${moduleName}\\`) ||
          source.toLowerCase().includes(`_modules/${moduleName}/`) ||
          source.toLowerCase().includes(`modules\\${moduleName}\\`)) {
        return moduleName;
      }
      
      // Check for module-specific path patterns
      if (moduleName === 'auth' && (source.includes('aop_modules/auth') || source.includes('auth/'))) {
        return moduleName;
      }
      
      if (moduleName === 'git' && source.includes('/git/')) {
        return moduleName;
      }
      
      if (moduleName === 'api' && source.includes('/api/')) {
        return moduleName;
      }
      
      if (moduleName === 'wiki' && source.includes('/wiki/')) {
        return moduleName;
      }
    }
    
    // Fallback: Check content for module-specific terms with higher threshold
    let bestMatch = { module: 'unknown', score: 0 };
    
    for (const [moduleName, moduleData] of Object.entries(modules)) {
      const score = this.calculateModuleRelevanceScore(content, moduleData);
      if (score > bestMatch.score && score > 0.5) { // Higher threshold for content-based detection
        bestMatch = { module: moduleName, score };
      }
    }
    
    return bestMatch.module;
  }

  /**
   * Calculate relevance score for a business module
   */
  calculateModuleRelevanceScore(content, moduleData) {
    let score = 0;
    let totalTerms = 0;

    // Check entities
    if (moduleData.entities) {
      moduleData.entities.forEach(entity => {
        totalTerms++;
        if (content.includes(entity.name.toLowerCase())) {
          score += 0.3;
        }
        if (entity.behaviors) {
          entity.behaviors.forEach(behavior => {
            totalTerms++;
            if (content.includes(behavior.toLowerCase())) {
              score += 0.2;
            }
          });
        }
      });
    }

    // Check domain events
    if (moduleData.domainEvents) {
      moduleData.domainEvents.forEach(event => {
        totalTerms++;
        if (content.includes(event.name.toLowerCase().replace('event', ''))) {
          score += 0.25;
        }
      });
    }

    // Check value objects
    if (moduleData.valueObjects) {
      moduleData.valueObjects.forEach(vo => {
        totalTerms++;
        if (content.includes(vo.name.toLowerCase())) {
          score += 0.2;
        }
      });
    }

    return totalTerms > 0 ? score / totalTerms : 0;
  }

  /**
   * Get bounded context for a business module
   */
  getBoundedContext(moduleName) {
    const moduleData = this.ubiquitousLanguage.businessModules[moduleName];
    return moduleData ? moduleData.boundedContext : 'Unknown Context';
  }

  /**
   * Get relevant domain events for a business module
   */
  getRelevantDomainEvents(moduleName) {
    const events = this.ubiquitousLanguage.domainEvents[moduleName];
    return events ? events : [];
  }

  /**
   * Extract relevant business terms from content
   */
  extractRelevantTerms(content) {
    const relevantTerms = [];
    
    // Check business terms
    for (const [term, definition] of Object.entries(this.ubiquitousLanguage.businessTerms || {})) {
      if (content.includes(term.toLowerCase()) || content.includes(definition.name.toLowerCase())) {
        relevantTerms.push(term);
      }
    }
    
    // Check technical terms
    for (const [term, definition] of Object.entries(this.ubiquitousLanguage.technicalTerms || {})) {
      if (content.includes(term.toLowerCase()) || content.includes(definition.name.toLowerCase())) {
        relevantTerms.push(term);
      }
    }
    
    return relevantTerms;
  }

  /**
   * Generate contextual annotation based on detected module and content
   */
  generateContextualAnnotation(moduleName, content) {
    if (moduleName === 'unknown') {
      return '// UBIQUITOUS LANGUAGE CONTEXT: Unknown module\n';
    }

    const moduleData = this.ubiquitousLanguage.businessModules[moduleName];
    if (!moduleData) {
      return '// UBIQUITOUS LANGUAGE CONTEXT: Unknown module\n';
    }

    let annotation = `// UBIQUITOUS LANGUAGE CONTEXT: ${moduleData.name.toUpperCase()}\n`;
    annotation += `// BOUNDED CONTEXT: ${moduleData.boundedContext}\n`;
    annotation += `// DOMAIN ROLE: ${moduleData.role}\n`;
    
    if (moduleData.type) {
      annotation += `// MODULE TYPE: ${moduleData.type}\n`;
    }
    
    // Add relevant entities if found in content
    const relevantEntities = moduleData.entities?.filter(entity => 
      content.toLowerCase().includes(entity.name.toLowerCase())
    );
    if (relevantEntities && relevantEntities.length > 0) {
      annotation += `// RELEVANT ENTITIES: ${relevantEntities.map(e => e.name).join(', ')}\n`;
    }

    // Add relevant domain events if applicable
    const relevantEvents = this.ubiquitousLanguage.domainEvents[moduleName]?.filter(event =>
      content.toLowerCase().includes(event.toLowerCase().replace('event', ''))
    );
    if (relevantEvents && relevantEvents.length > 0) {
      annotation += `// DOMAIN EVENTS: ${relevantEvents.join(', ')}\n`;
    }

    annotation += '//\n';
    return annotation;
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

    // Log all chunks for debugging
    console.log(`[${new Date().toISOString()}] 📋 [RAG-INDEX] CHUNK BREAKDOWN:`);
    splittedDocs.forEach((doc, index) => {
      const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ').trim();
      console.log(`[${new Date().toISOString()}] 📄 [CHUNK ${index + 1}/${splittedDocs.length}] ${doc.metadata.type || doc.metadata.source} (${doc.pageContent.length} chars)`);
      console.log(`[${new Date().toISOString()}] 📝 Preview: ${preview}${doc.pageContent.length > 100 ? '...' : ''}`);
      console.log(`[${new Date().toISOString()}] 🏷️  Metadata:`, JSON.stringify(doc.metadata, null, 2));
      console.log(`[${new Date().toISOString()}] ${'─'.repeat(80)}`);
    });

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

      // Step 1: Enhance with ubiquitous language context (first step in RAG pipeline)
      console.log(`[${new Date().toISOString()}] 📚 DATA-PREP: Applying ubiquitous language enhancement...`);
      const ubiqLanguageEnhancedDocs = [];
      for (const doc of enhancedDocuments) {
        try {
          const ubiqEnhancedDoc = this.enhanceWithUbiquitousLanguage(doc);
          ubiqLanguageEnhancedDocs.push(ubiqEnhancedDoc);
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to enhance ${doc.metadata.source} with ubiquitous language: ${error.message}`);
          // Fall back to original document if enhancement fails
          ubiqLanguageEnhancedDocs.push(doc);
        }
      }
      
      console.log(`[${new Date().toISOString()}] 📚 DATA-PREP: Ubiquitous language enhancement completed for ${ubiqLanguageEnhancedDocs.length} documents`);

      // Step 2: Apply semantic preprocessing to enhance chunks with technical context
      console.log(`[${new Date().toISOString()}] 🧠 DATA-PREP: Applying semantic preprocessing...`);
      const semanticallyEnhancedDocs = [];
      for (const doc of ubiqLanguageEnhancedDocs) {
        try {
          const enhancedDoc = await this.semanticPreprocessor.preprocessChunk(doc);
          semanticallyEnhancedDocs.push(enhancedDoc);
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to preprocess ${doc.metadata.source}: ${error.message}`);
          // Fall back to original document if preprocessing fails
          semanticallyEnhancedDocs.push(doc);
        }
      }
      
      console.log(`[${new Date().toISOString()}] 🧠 DATA-PREP: Semantic preprocessing completed for ${semanticallyEnhancedDocs.length} documents`);

      // Log processing pipeline summary
      this.logProcessingPipelineSummary(ubiqLanguageEnhancedDocs, semanticallyEnhancedDocs);

      // Step 3: Apply AST-based splitting for code files, regular splitting for others
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Applying intelligent splitting (AST for code, regular for docs)...`);
      const splitDocs = await this.intelligentSplitDocuments(semanticallyEnhancedDocs);
      
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Split into ${splitDocs.length} chunks`);

      // Log chunk breakdown for repository documents
      console.log(`[${new Date().toISOString()}] 📋 [DATA-PREP] SEMANTICALLY ENHANCED + AST-SPLIT REPOSITORY CHUNK BREAKDOWN:`);
      splitDocs.forEach((doc, index) => {
        const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ').trim();
        const semanticInfo = doc.metadata.enhanced ? 
          `${doc.metadata.semantic_role}|${doc.metadata.layer}|${doc.metadata.eventstorm_module}` : 
          'not-enhanced';
        const astInfo = doc.metadata.chunk_type || 'regular';
        const astDetails = doc.metadata.semantic_unit ? 
          `${doc.metadata.semantic_unit}(${doc.metadata.function_name})` : 
          'n/a';
        
        console.log(`[${new Date().toISOString()}] 📄 [REPO-CHUNK ${index + 1}/${splitDocs.length}] ${doc.metadata.source} (${doc.pageContent.length} chars)`);
        console.log(`[${new Date().toISOString()}] 📝 Preview: ${preview}${doc.pageContent.length > 100 ? '...' : ''}`);
        console.log(`[${new Date().toISOString()}] 🏷️  FileType: ${doc.metadata.fileType}, Repo: ${doc.metadata.repoName}`);
        console.log(`[${new Date().toISOString()}] 🧠 Semantic: ${semanticInfo}, EntryPoint: ${doc.metadata.is_entrypoint || false}, Complexity: ${doc.metadata.complexity || 'unknown'}`);
        console.log(`[${new Date().toISOString()}] 🌳 AST: ${astInfo}, Unit: ${astDetails}, Lines: ${doc.metadata.start_line || '?'}-${doc.metadata.end_line || '?'}`);
        console.log(`[${new Date().toISOString()}] ${'─'.repeat(80)}`);
      });

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
   * Apply intelligent splitting: AST-based for code, regular for documentation
   */
  async intelligentSplitDocuments(documents) {
    const allSplitDocs = [];
    const astStats = { attempted: 0, successful: 0, failed: 0, fallback: 0 };
    
    for (const doc of documents) {
      const source = doc.metadata.source || '';
      const isCodeFile = this.astCodeSplitter.shouldUseASTSplitting(doc.metadata);
      
      if (isCodeFile) {
        astStats.attempted++;
        try {
          console.log(`[${new Date().toISOString()}] AST: Processing ${source}`);
          const astChunks = await this.astCodeSplitter.splitCodeDocument(doc);
          
          if (astChunks.length > 1 || (astChunks[0] && astChunks[0].metadata.chunk_type === 'ast_semantic')) {
            astStats.successful++;
            allSplitDocs.push(...astChunks);
            console.log(`[${new Date().toISOString()}] AST: Successfully split ${source} into ${astChunks.length} semantic chunks`);
          } else {
            astStats.fallback++;
            // Fallback to regular splitting
            const regularChunks = await this.regularSplitDocument(doc);
            allSplitDocs.push(...regularChunks);
            console.log(`[${new Date().toISOString()}] AST: Used fallback splitting for ${source}`);
          }
        } catch (error) {
          astStats.failed++;
          console.warn(`[${new Date().toISOString()}] AST: Failed to split ${source}, using regular splitting: ${error.message}`);
          const regularChunks = await this.regularSplitDocument(doc);
          allSplitDocs.push(...regularChunks);
        }
      } else {
        // Use regular splitting for non-code files
        const regularChunks = await this.regularSplitDocument(doc);
        allSplitDocs.push(...regularChunks);
      }
    }
    
    console.log(`[${new Date().toISOString()}] 📊 AST SPLITTING SUMMARY:`);
    console.log(`[${new Date().toISOString()}] 📊 AST attempted: ${astStats.attempted}`);
    console.log(`[${new Date().toISOString()}] 📊 AST successful: ${astStats.successful}`);
    console.log(`[${new Date().toISOString()}] 📊 AST fallback: ${astStats.fallback}`);
    console.log(`[${new Date().toISOString()}] 📊 AST failed: ${astStats.failed}`);
    console.log(`[${new Date().toISOString()}] 📊 Total chunks created: ${allSplitDocs.length}`);
    
    return allSplitDocs;
  }

  /**
   * Regular text splitting for non-code files
   */
  async regularSplitDocument(document) {
    const splitter = this.createSmartSplitter([document]);
    return await splitter.splitDocuments([document]);
  }

  /**
   * Log semantic analysis summary to provide insights into the processed documents
   */
  logSemanticAnalysisSummary(documents) {
    const semanticStats = {
      roles: {},
      layers: {},
      modules: {},
      entryPoints: 0,
      complexity: { high: 0, medium: 0, low: 0 },
      enhanced: 0
    };

    documents.forEach(doc => {
      if (doc.metadata.enhanced) {
        semanticStats.enhanced++;
        
        // Count roles
        const role = doc.metadata.semantic_role || 'unknown';
        semanticStats.roles[role] = (semanticStats.roles[role] || 0) + 1;
        
        // Count layers
        const layer = doc.metadata.layer || 'unknown';
        semanticStats.layers[layer] = (semanticStats.layers[layer] || 0) + 1;
        
        // Count modules
        const module = doc.metadata.eventstorm_module || 'unknown';
        semanticStats.modules[module] = (semanticStats.modules[module] || 0) + 1;
        
        // Count entry points
        if (doc.metadata.is_entrypoint) {
          semanticStats.entryPoints++;
        }
        
        // Count complexity
        const complexity = doc.metadata.complexity || 'unknown';
        if (complexity in semanticStats.complexity) {
          semanticStats.complexity[complexity]++;
        }
      }
    });

    console.log(`[${new Date().toISOString()}] 🧠 SEMANTIC ANALYSIS SUMMARY:`);
    console.log(`[${new Date().toISOString()}] 📊 Enhanced documents: ${semanticStats.enhanced}/${documents.length}`);
    console.log(`[${new Date().toISOString()}] 📊 Entry points detected: ${semanticStats.entryPoints}`);
    
    console.log(`[${new Date().toISOString()}] 📊 Semantic roles:`);
    Object.entries(semanticStats.roles).forEach(([role, count]) => {
      console.log(`[${new Date().toISOString()}]    ${role}: ${count}`);
    });
    
    console.log(`[${new Date().toISOString()}] 📊 Architectural layers:`);
    Object.entries(semanticStats.layers).forEach(([layer, count]) => {
      console.log(`[${new Date().toISOString()}]    ${layer}: ${count}`);
    });
    
    console.log(`[${new Date().toISOString()}] 📊 EventStorm modules:`);
    Object.entries(semanticStats.modules).forEach(([module, count]) => {
      console.log(`[${new Date().toISOString()}]    ${module}: ${count}`);
    });
    
    console.log(`[${new Date().toISOString()}] 📊 Complexity distribution:`);
    Object.entries(semanticStats.complexity).forEach(([level, count]) => {
      console.log(`[${new Date().toISOString()}]    ${level}: ${count}`);
    });
    
    console.log(`[${new Date().toISOString()}] ${'═'.repeat(80)}`);
  }

  /**
   * Log processing pipeline summary to show ubiquitous language and semantic enhancements
   */
  logProcessingPipelineSummary(ubiqDocs, semanticDocs) {
    // Analyze ubiquitous language enhancements
    const ubiqStats = {
      businessModules: {},
      boundedContexts: {},
      totalTermsFound: 0,
      enhanced: 0
    };

    ubiqDocs.forEach(doc => {
      if (doc.metadata.ubiq_business_module) {
        const module = doc.metadata.ubiq_business_module;
        ubiqStats.businessModules[module] = (ubiqStats.businessModules[module] || 0) + 1;
        ubiqStats.enhanced++;
      }
      
      if (doc.metadata.ubiq_bounded_context) {
        const context = doc.metadata.ubiq_bounded_context;
        ubiqStats.boundedContexts[context] = (ubiqStats.boundedContexts[context] || 0) + 1;
      }

      if (doc.metadata.ubiq_terminology && Array.isArray(doc.metadata.ubiq_terminology)) {
        ubiqStats.totalTermsFound += doc.metadata.ubiq_terminology.length;
      }
    });

    // Analyze semantic preprocessing results
    const semanticStats = {
      roles: {},
      layers: {},
      entryPoints: 0,
      enhanced: 0
    };

    semanticDocs.forEach(doc => {
      if (doc.metadata.enhanced) {
        semanticStats.enhanced++;
        
        const role = doc.metadata.semantic_role || 'unknown';
        semanticStats.roles[role] = (semanticStats.roles[role] || 0) + 1;
        
        const layer = doc.metadata.layer || 'unknown';
        semanticStats.layers[layer] = (semanticStats.layers[layer] || 0) + 1;
        
        if (doc.metadata.is_entrypoint) {
          semanticStats.entryPoints++;
        }
      }
    });

    console.log(`[${new Date().toISOString()}] 📊 PROCESSING PIPELINE SUMMARY:`);
    console.log(`[${new Date().toISOString()}] ${'═'.repeat(80)}`);
    
    console.log(`[${new Date().toISOString()}] 📚 UBIQUITOUS LANGUAGE ENHANCEMENT:`);
    console.log(`[${new Date().toISOString()}]    Enhanced documents: ${ubiqStats.enhanced}/${ubiqDocs.length}`);
    console.log(`[${new Date().toISOString()}]    Domain terms found: ${ubiqStats.totalTermsFound}`);
    
    console.log(`[${new Date().toISOString()}]    Business modules detected:`);
    Object.entries(ubiqStats.businessModules).forEach(([module, count]) => {
      console.log(`[${new Date().toISOString()}]      ${module}: ${count} documents`);
    });
    
    console.log(`[${new Date().toISOString()}]    Bounded contexts:`);
    Object.entries(ubiqStats.boundedContexts).forEach(([context, count]) => {
      console.log(`[${new Date().toISOString()}]      ${context}: ${count} documents`);
    });

    console.log(`[${new Date().toISOString()}] 🧠 SEMANTIC PREPROCESSING:`);
    console.log(`[${new Date().toISOString()}]    Enhanced documents: ${semanticStats.enhanced}/${semanticDocs.length}`);
    console.log(`[${new Date().toISOString()}]    Entry points: ${semanticStats.entryPoints}`);
    
    console.log(`[${new Date().toISOString()}]    Semantic roles:`);
    Object.entries(semanticStats.roles).forEach(([role, count]) => {
      console.log(`[${new Date().toISOString()}]      ${role}: ${count}`);
    });
    
    console.log(`[${new Date().toISOString()}]    Architectural layers:`);
    Object.entries(semanticStats.layers).forEach(([layer, count]) => {
      console.log(`[${new Date().toISOString()}]      ${layer}: ${count}`);
    });
    
    console.log(`[${new Date().toISOString()}] ${'═'.repeat(80)}`);
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
