// RepositoryProcessor.js
"use strict";

const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');
const FileFilteringUtils = require('../utils/FileFilteringUtils');
const ContentAwareSplitterRouter = require('./ContentAwareSplitterRouter');
const ChunkQualityAnalyzer = require('../analyzers/ChunkQualityAnalyzer');

/**
 * Dedicated processor for GitHub repository source code
 * Handles repository cloning, code analysis, AST-based splitting, and semantic enhancement
 * Enhanced with comprehensive binary file filtering
 */
class RepositoryProcessor {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repositoryManager = options.repositoryManager;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.astBasedSplitter = options.astBasedSplitter;
    this.semanticPreprocessor = options.semanticPreprocessor;
    
    // Initialize content-aware splitter router - fixes issue where all files routed through AST splitter
    this.contentAwareSplitterRouter = new ContentAwareSplitterRouter({
      maxTokens: 1400,        // Token-based limit (more accurate than character count)
      minTokens: 120,         // Minimum meaningful tokens per chunk
      overlapTokens: 180,     // Token overlap for context preservation
      encodingModel: 'cl100k_base'  // OpenAI's token encoding model
    });
    this.chunkQualityAnalyzer = new ChunkQualityAnalyzer();
    
    console.log(`[${new Date().toISOString()}] 🚀 REPOSITORY PROCESSOR: Enhanced with content-aware splitter routing`);
  }

  /**
   * Process GitHub repository source code
   */
  async processRepository(repoUrl, branch = 'main', namespace = null) {
    console.log(`[${new Date().toISOString()}] 🔧 REPOSITORY PROCESSOR: Starting repository processing`);
    console.log(`[${new Date().toISOString()}] 📂 REPOSITORY: ${repoUrl} (branch: ${branch})`);
    console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Processing source code with AST-based intelligent splitting and semantic analysis`);

    if (!namespace) {
      namespace = this.repositoryManager.sanitizeId(repoUrl);
    }

    // Load repository documents
    const documents = await this.loadRepositoryDocuments(repoUrl, branch);
    
    if (!documents || documents.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ REPOSITORY: No documents found in repository`);
      return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
    }

    console.log(`[${new Date().toISOString()}] 📄 REPOSITORY: Loaded ${documents.length} source files from repository`);

    // Apply intelligent document processing
    const processedDocuments = await this.intelligentProcessDocuments(documents);
    
    console.log(`[${new Date().toISOString()}] 🧠 REPOSITORY: Applied intelligent processing to ${documents.length} documents`);

    // Split documents using AST-based intelligent chunking
    const splitDocuments = await this.intelligentSplitDocuments(processedDocuments);
    
    console.log(`[${new Date().toISOString()}] ✂️  REPOSITORY: Split ${documents.length} documents into ${splitDocuments.length} chunks`);

    // Enhance with ubiquitous language if available
    const enhancedDocuments = await this.enhanceWithDomainKnowledge(splitDocuments);
    
    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY: Enhanced ${splitDocuments.length} chunks with domain knowledge`);

    // Store in vector database
    await this.storeRepositoryDocuments(enhancedDocuments, namespace);

    console.log(`[${new Date().toISOString()}] ✅ REPOSITORY PROCESSOR: Successfully processed repository into ${enhancedDocuments.length} chunks`);

    return {
      success: true,
      documentsProcessed: documents.length,
      chunksGenerated: enhancedDocuments.length,
      namespace,
      repoUrl,
      branch,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Load documents from GitHub repository
   */
  async loadRepositoryDocuments(repoUrl, branch) {
    console.log(`[${new Date().toISOString()}] 📥 REPOSITORY LOADING: Loading documents from ${repoUrl}...`);
    
    try {
      const loader = new GithubRepoLoader(repoUrl, {
        branch,
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
        ignoreFiles: FileFilteringUtils.getEnhancedIgnorePatterns()
      });

      console.log(`[${new Date().toISOString()}] 🔍 FILTERING: Using enhanced file filtering to prevent binary contamination`);
      const documents = await loader.load();
      
      // Apply additional post-load filtering
      console.log(`[${new Date().toISOString()}] 🧹 POST-FILTER: Scanning ${documents.length} documents for binary content...`);
      const cleanDocuments = await FileFilteringUtils.filterDocuments(documents);
      
      // Filter and categorize documents
      const categorizedDocs = cleanDocuments.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          file_type: this.repositoryManager.getFileType(doc.metadata.source || ''),
          repository_url: repoUrl,
          branch: branch,
          loaded_at: new Date().toISOString(),
          filtered: true
        }
      }));

      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY LOADING: Successfully loaded ${categorizedDocs.length} clean documents (filtered ${documents.length - cleanDocuments.length} binary/problematic files)`);
      return categorizedDocs;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY LOADING: Error loading repository:`, error.message);
      return [];
    }
  }

  /**
   * Apply intelligent preprocessing to documents
   */
  async intelligentProcessDocuments(documents) {
    console.log(`[${new Date().toISOString()}] 🧠 REPOSITORY PREPROCESSING: Applying semantic analysis and code understanding...`);

    const processedDocs = [];
    
    for (const doc of documents) {
      try {
        let processedDoc = { ...doc };

        // Apply semantic preprocessing if available
        if (this.semanticPreprocessor && doc.metadata.file_type === 'code') {
          processedDoc = await this.semanticPreprocessor.preprocessDocument(processedDoc);
        }

        // Add repository-specific metadata
        processedDoc.metadata = {
          ...processedDoc.metadata,
          processing_method: 'intelligent_analysis',
          content_length: processedDoc.pageContent.length,
          preprocessing_applied: !!this.semanticPreprocessor
        };

        processedDocs.push(processedDoc);

      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Error preprocessing ${doc.metadata.source}:`, error.message);
        processedDocs.push(doc); // Use original if preprocessing fails
      }
    }

    console.log(`[${new Date().toISOString()}] 🧠 REPOSITORY PREPROCESSING: Processed ${processedDocs.length} documents with intelligent analysis`);
    return processedDocs;
  }

  /**
   * Split documents using CONTENT-AWARE routing instead of forcing all through AST splitter
   * Routes documents to appropriate splitters based on content type and file extension
   */
  async intelligentSplitDocuments(documents) {
    console.log(`[${new Date().toISOString()}] ✂️  CONTENT-AWARE SPLITTING: Routing ${documents.length} documents to specialized splitters`);
    console.log(`[${new Date().toISOString()}] 🎯 STRATEGY: Content-type aware routing (Code→AST, Markdown→Header, OpenAPI→Operation, etc.)`);

    const allChunks = [];
    let qualityImprovements = 0;
    let processedFileCount = 0;
    
    for (const doc of documents) {
      try {
        // Use content-aware router that routes to appropriate splitter based on file type
        const routedChunks = await this.contentAwareSplitterRouter.splitDocument({
          pageContent: doc.pageContent, // Ensure consistent format
          metadata: {
            source: doc.metadata.source || 'unknown',
            ...doc.metadata
          }
        });

        // Ensure routedChunks is an array
        const chunksArray = Array.isArray(routedChunks) ? routedChunks : [routedChunks];

        processedFileCount++;
        
        // Analyze quality improvements
        const qualityAnalysis = this.chunkQualityAnalyzer.analyzeTraceChunks(chunksArray);
        if (qualityAnalysis.qualityScore > 70) {
          qualityImprovements++;
        }

        console.log(`[${new Date().toISOString()}] ✨ ROUTED: Split ${doc.metadata.source} into ${chunksArray.length} content-aware chunks (score: ${qualityAnalysis.qualityScore})`);

        // Add enhanced metadata with quality metrics
        const enrichedChunks = chunksArray.map((chunk, index) => ({
          pageContent: chunk.pageContent || chunk.content || '',
          metadata: {
            ...doc.metadata,
            ...(chunk.metadata || {}),
            chunk_index: index,
            total_chunks: chunksArray.length,
            splitting_method: chunk.metadata?.splitting_method || 'content_aware_routing',
            quality_score: qualityAnalysis.qualityScore,
            semantic_type: (chunk.metadata && chunk.metadata.semantic_type) || 'unknown',
            chunk_type: (chunk.metadata && chunk.metadata.chunk_type) || 'unknown',
            functions: (chunk.metadata && chunk.metadata.function_names) || [],
            original_document: doc.metadata.source,
            content_aware_routing: true
          }
        }));

        allChunks.push(...enrichedChunks);

      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ ROUTING: Error with ${doc.metadata.source}, using fallback:`, error.message);
        
        // Fallback to standard splitting if routing fails
        const fallbackChunks = await this.standardSplitDocument(doc);
        allChunks.push(...fallbackChunks.map(chunk => ({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            splitting_method: 'fallback_standard',
            content_aware_routing: false
          }
        })));
      }
    }

    console.log(`[${new Date().toISOString()}] ✅ CONTENT-AWARE ROUTING COMPLETE:`);
    console.log(`[${new Date().toISOString()}]    📊 Processed: ${processedFileCount} files`);
    console.log(`[${new Date().toISOString()}]    ⭐ High Quality: ${qualityImprovements}/${processedFileCount} files (${Math.round(qualityImprovements/processedFileCount*100)}%)`);
    console.log(`[${new Date().toISOString()}]    📄 Total Chunks: ${allChunks.length}`);
    
    return allChunks;
  }

  /**
   * Standard text-based document splitting
   */
  async standardSplitDocument(doc) {
    // Configure splitter based on file type
    let chunkSize, chunkOverlap, separators;
    
    if (doc.metadata.file_type === 'code') {
      chunkSize = 1000;
      chunkOverlap = 100;
      separators = ['\n\nclass ', '\n\nfunction ', '\n\nconst ', '\n\n', '\n', ' ', ''];
    } else if (doc.metadata.file_type === 'markdown') {
      chunkSize = 1500;
      chunkOverlap = 200;
      separators = ['\n## ', '\n### ', '\n\n', '\n', ' ', ''];
    } else {
      chunkSize = 1200;
      chunkOverlap = 150;
      separators = ['\n\n', '\n', ' ', ''];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators
    });

    return await splitter.splitDocuments([doc]);
  }

  /**
   * Enhance documents with domain knowledge
   */
  async enhanceWithDomainKnowledge(documents) {
    if (!this.ubiquitousLanguageProcessor) {
      console.log(`[${new Date().toISOString()}] ℹ️ REPOSITORY: No ubiquitous language processor available, skipping enhancement`);
      return documents;
    }

    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY ENHANCEMENT: Applying domain knowledge to ${documents.length} chunks...`);

    const enhancedDocs = [];
    
    for (const doc of documents) {
      try {
        const enhancedDoc = await this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(doc);
        enhancedDocs.push(enhancedDoc);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Error enhancing document:`, error.message);
        enhancedDocs.push(doc); // Use original if enhancement fails
      }
    }

    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY ENHANCEMENT: Enhanced ${enhancedDocs.length} chunks with domain knowledge`);
    return enhancedDocs;
  }

  /**
   * Store repository documents in vector database
   */
  async storeRepositoryDocuments(documents, namespace) {
    console.log(`[${new Date().toISOString()}] 🗄️ REPOSITORY STORAGE: Storing ${documents.length} repository chunks in namespace '${namespace}'`);
    
    // Analyze final quality before storage
    const qualityAnalysis = this.chunkQualityAnalyzer.analyzeTraceChunks(documents);
    console.log(`[${new Date().toISOString()}] 📊 FINAL QUALITY ANALYSIS:`);
    console.log(`[${new Date().toISOString()}]    ⭐ Overall Score: ${qualityAnalysis.qualityScore}/100`);
    console.log(`[${new Date().toISOString()}]    🔍 Issues Found: ${qualityAnalysis.issues.length}`);
    console.log(`[${new Date().toISOString()}]    💡 Recommendations: ${qualityAnalysis.recommendations.length}`);

    if (!this.pinecone) {
      console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Pinecone not available, skipping storage`);
      return;
    }

    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      const vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: index,
        namespace: namespace
      });

      // Generate unique IDs
      const documentIds = documents.map((doc, index) => {
        const sanitizedSource = this.repositoryManager.sanitizeId(doc.metadata.source || 'repo');
        const sanitizedMethod = this.repositoryManager.sanitizeId(doc.metadata.splitting_method || 'unknown');
        return `repo_${sanitizedSource}_${sanitizedMethod}_chunk_${index}`;
      });

      // Store with rate limiting if available
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(async () => {
          await vectorStore.addDocuments(documents, { ids: documentIds });
        });
      } else {
        await vectorStore.addDocuments(documents, { ids: documentIds });
      }

      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY STORAGE: Successfully stored ${documents.length} repository chunks with quality score ${qualityAnalysis.qualityScore}/100`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY STORAGE: Error storing documents:`, error.message);
      throw error;
    }
  }

  /**
   * Process only specific changed files for incremental processing
   */
  async processChangedFiles(repoPath, changedFiles, namespace, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL REPOSITORY: Processing ${changedFiles.length} changed files`);
    
    if (changedFiles.length === 0) {
      return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
    }

    try {
      const fs = require('fs').promises;
      const path = require('path');
      const processedDocuments = [];

      // Process each changed file
      for (const filePath of changedFiles) {
        const fullPath = path.join(repoPath, filePath);
        
        try {
          // Check if file exists (might have been deleted)
          const stats = await fs.stat(fullPath);
          if (!stats.isFile()) continue;

          // Read file content
          const content = await fs.readFile(fullPath, 'utf-8');
          
          // Create document object
          const document = {
            pageContent: content,
            metadata: {
              source: filePath,
              githubOwner,
              repoName,
              fileType: this.repositoryManager.getFileType(filePath),
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
              incremental: true,
              processedAt: new Date().toISOString()
            }
          };

          // Apply ubiquitous language enhancement if available
          if (this.ubiquitousLanguageProcessor) {
            const enhancedDoc = this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(document);
            processedDocuments.push(enhancedDoc);
          } else {
            processedDocuments.push(document);
          }

          console.log(`[${new Date().toISOString()}] ✅ INCREMENTAL: Processed ${filePath} (${content.length} chars)`);

        } catch (fileError) {
          if (fileError.code === 'ENOENT') {
            console.log(`[${new Date().toISOString()}] 🗑️ INCREMENTAL: File deleted - ${filePath}`);
            // TODO: Handle file deletion by removing vectors from Pinecone
          } else {
            console.warn(`[${new Date().toISOString()}] ⚠️ INCREMENTAL: Error processing ${filePath}:`, fileError.message);
          }
        }
      }

      if (processedDocuments.length === 0) {
        console.log(`[${new Date().toISOString()}] 📭 INCREMENTAL: No processable documents found in changed files`);
        return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
      }

      // Apply intelligent splitting
      const splitDocuments = await this.intelligentSplitDocuments(processedDocuments);
      
      // Store in Pinecone
      await this.storeRepositoryDocuments(splitDocuments, namespace);

      console.log(`[${new Date().toISOString()}] ✅ INCREMENTAL COMPLETE: Processed ${processedDocuments.length} files into ${splitDocuments.length} chunks`);
      
      return {
        success: true,
        documentsProcessed: processedDocuments.length,
        chunksGenerated: splitDocuments.length,
        changedFiles: changedFiles.length,
        processedFiles: processedDocuments.map(doc => doc.metadata.source),
        namespace
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ INCREMENTAL: Error processing changed files:`, error.message);
      throw error;
    }
  }
}

module.exports = RepositoryProcessor;
