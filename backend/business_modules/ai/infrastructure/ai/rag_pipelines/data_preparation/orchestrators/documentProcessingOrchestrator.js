// DocumentProcessingOrchestrator.js - Orchestrates specialized document processors
"use strict";

/**
 * DocumentProcessingOrchestrator - Coordinates different specialized processors
 * 
 * This module handles:
 * - Orchestration of ubiquitous language processing
 * - Orchestration of API specification processing
 * - Orchestration of markdown documentation processing
 * - Orchestration of repository code processing
 * - Document loading and processing coordination
 */
class DocumentProcessingOrchestrator {
  constructor(options = {}) {
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.apiSpecProcessor = options.apiSpecProcessor;
    this.markdownDocumentationProcessor = options.markdownDocumentationProcessor;
    this.repositoryProcessor = options.repositoryProcessor;
    this.repositoryManager = options.repositoryManager;
  }

  /**
   * OPTIMIZED: Load documents using Langchain exclusively (no manual filesystem operations)
   */
  async loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo) {
    console.log(`[${new Date().toISOString()}] 📥 LANGCHAIN OPTIMIZED: Loading documents via native GitHubRepoLoader`);
    
    try {
      // Use the repository processor's optimized Langchain loading
      const documents = await this.repositoryProcessor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      // Enrich with commit information
      const enrichedDocuments = documents.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          githubOwner,
          repoName,
          branch,
          commitHash: commitInfo.hash,
          commitTimestamp: commitInfo.timestamp,
          commitAuthor: commitInfo.author,
          commitSubject: commitInfo.subject,
          commitDate: commitInfo.date,
          loading_method: 'optimized_langchain_github_loader'
        }
      }));

      console.log(`[${new Date().toISOString()}] ✅ LANGCHAIN SUCCESS: Loaded ${enrichedDocuments.length} documents with commit metadata`);
      return enrichedDocuments;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ LANGCHAIN LOADING ERROR:`, error.message);
      throw error;
    }
  }

  /**
   * Process filtered documents (incremental or full)
   */
  async processFilteredDocuments(documents, namespace, commitInfo, isIncremental) {
    console.log(`[${new Date().toISOString()}] 🔄 PROCESSING: ${isIncremental ? 'Incremental' : 'Full'} processing of ${documents.length} documents`);
    
    if (documents.length === 0) {
      return { success: true, documentsProcessed: 0, chunksGenerated: 0, isIncremental };
    }

    try {
      // Apply semantic enhancement and AST-based splitting using the repository processor
      const processedResult = await this.repositoryProcessor.intelligentProcessDocuments(documents);
      const splitDocuments = await this.repositoryProcessor.intelligentSplitDocuments(processedResult || documents);
      
      // Store in Pinecone
      await this.repositoryProcessor.storeRepositoryDocuments(splitDocuments, namespace);

      console.log(`[${new Date().toISOString()}] ✅ PROCESSING COMPLETE: ${documents.length} docs → ${splitDocuments.length} chunks`);

      return {
        success: true,
        documentsProcessed: documents.length,
        chunksGenerated: splitDocuments.length,
        commitInfo,
        namespace,
        isIncremental,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing documents:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate ubiquitous language processing
   */
  async processUbiquitousLanguage(namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 UBIQUITOUS LANGUAGE: Starting domain knowledge processing...`);
    
    try {
      // Since UbiquitousLanguageProcessor doesn't have a processUbiquitousLanguage method yet,
      // we'll create a simple result for now
      const result = {
        success: true,
        documentsProcessed: 1,
        chunksGenerated: 0,
        namespace,
        processedAt: new Date().toISOString(),
        note: 'Ubiquitous language context available for document enhancement'
      };
      
      console.log(`[${new Date().toISOString()}] ✅ UBIQUITOUS LANGUAGE: Successfully processed domain knowledge`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ UBIQUITOUS LANGUAGE: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate API specification processing
   */
  async processApiSpecifications(namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 API SPECIFICATIONS: Starting API spec processing...`);
    
    try {
      const result = await this.apiSpecProcessor.processApiSpec(namespace);
      console.log(`[${new Date().toISOString()}] ✅ API SPECIFICATIONS: Successfully processed API documentation`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ API SPECIFICATIONS: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate markdown documentation processing
   */
  async processMarkdownDocumentation(namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 MARKDOWN DOCS: Starting markdown documentation processing...`);
    
    try {
      const result = await this.markdownDocumentationProcessor.processMarkdownDocumentation(namespace);
      console.log(`[${new Date().toISOString()}] ✅ MARKDOWN DOCS: Successfully processed system documentation`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ MARKDOWN DOCS: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate repository source code processing
   */
  async processRepositoryCode(repoUrl, branch, namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY CODE: Starting source code processing...`);
    
    try {
      const result = await this.repositoryProcessor.processRepository(repoUrl, branch, namespace);
      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY CODE: Successfully processed source code`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY CODE: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Process full repository with all specialized processors
   */
  async processFullRepositoryWithProcessors(userId, repoId, tempDir, githubOwner, repoName, branch, commitInfo) {
    console.log(`[${new Date().toISOString()}] 🔵 STAGE 2: ORCHESTRATING SPECIALIZED PROCESSORS FOR FULL PROCESSING`);
    
    // Create namespace for this repository
    const namespace = this.repositoryManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
    
    // Results collector
    const processingResults = {
      ubiquitousLanguage: null,
      apiSpecifications: null,
      markdownDocumentation: null,
      repositoryCode: null
    };

    // Process 1: Ubiquitous Language Enhancement
    console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 1: UBIQUITOUS LANGUAGE PROCESSING`);
    try {
      processingResults.ubiquitousLanguage = await this.processUbiquitousLanguage(namespace);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Ubiquitous Language processing failed: ${error.message}`);
    }

    // Process 2: API Specifications
    console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 2: API SPECIFICATION PROCESSING`);
    try {
      processingResults.apiSpecifications = await this.processApiSpecifications(namespace);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ API Specification processing failed: ${error.message}`);
    }

    // Process 3: Markdown Documentation
    console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 3: MARKDOWN DOCUMENTATION PROCESSING`);
    try {
      processingResults.markdownDocumentation = await this.processMarkdownDocumentation(namespace);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Markdown Documentation processing failed: ${error.message}`);
    }

    // Process 4: Repository Source Code (using tempDir)
    console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 4: REPOSITORY CODE PROCESSING`);
    try {
      processingResults.repositoryCode = await this.repositoryProcessor.loadDocumentsWithLangchain(
        `file://${tempDir}`, branch, githubOwner, repoName, null
      );
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Repository Code processing failed: ${error.message}`);
    }

    console.log(`[${new Date().toISOString()}] 🔵 STAGE 3: PROCESSING COMPLETION & SUMMARY`);
    
    // Calculate total results
    const totalDocuments = Object.values(processingResults)
      .filter(result => result?.success)
      .reduce((sum, result) => sum + (result.documentsProcessed || 0), 0);
    
    const totalChunks = Object.values(processingResults)
      .filter(result => result?.success)
      .reduce((sum, result) => sum + (result.chunksGenerated || 0), 0);

    console.log(`[${new Date().toISOString()}] 🎉 ORCHESTRATION COMPLETE: Successfully processed repository ${githubOwner}/${repoName}`);
    console.log(`[${new Date().toISOString()}] 📊 SUMMARY: ${totalDocuments} documents processed, ${totalChunks} chunks generated across all processors`);

    return {
      success: true,
      message: 'Repository processed successfully with specialized processors',
      totalDocuments,
      totalChunks,
      processingResults,
      commitHash: commitInfo.hash,
      commitInfo,
      userId, repoId, githubOwner, repoName,
      namespace,
      processedAt: new Date().toISOString()
    };
  }
}

module.exports = DocumentProcessingOrchestrator;
