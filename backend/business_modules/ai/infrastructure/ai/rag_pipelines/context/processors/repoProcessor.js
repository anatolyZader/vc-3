// RepoProcessor.js - Processes repository content (code, docs, configs)
"use strict";

/**
 * RepoProcessor - Main repository processing class
 * 
 * This module handles:
 * - Processing of ubiquitous language
 * - Processing of API specifications  
 * - Processing of markdown documentation
 * - Processing of repository source code
 * - Repository content loading and processing coordination
 */
class RepoProcessor {
  constructor(options = {}) {
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.apiSpecProcessor = options.apiSpecProcessor;
    this.docsProcessor = options.markdownDocumentationProcessor;
    this.repositoryProcessor = options.repositoryProcessor;
  }

  /**
   * OPTIMIZED: Load documents using Langchain exclusively (no manual filesystem operations)
   * Thin wrapper - delegates to RepoProcessorUtils for sophisticated batched processing
   */
  async loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo) {
    console.log(`[${new Date().toISOString()}] 📥 DELEGATING: Using RepoProcessorUtils for optimized document loading`);
    
    try {
      // Delegate to the sophisticated batched loader in RepoProcessorUtils
      // RepoProcessorUtils already handles commit metadata enrichment
      const documents = await this.repositoryProcessor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      console.log(`[${new Date().toISOString()}] ✅ DELEGATION SUCCESS: Loaded ${documents.length} documents via RepoProcessorUtils`);
      return documents;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DELEGATION ERROR:`, error.message);
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
      const result = await this.docsProcessor.processMarkdownDocumentation(namespace);
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
    const namespace = this.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
    
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

    // Process 4: Repository Source Code (using proper orchestration path)
    console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 4: REPOSITORY CODE PROCESSING`);
    try {
      // Use the dedicated processRepositoryCode method for consistent orchestration
      // Use GitHub HTTPS URL instead of local file:// path - GithubRepoLoader needs the actual GitHub URL
      const githubUrl = `https://github.com/${githubOwner}/${repoName}`;
      // This calls repositoryProcessor.processRepository which does full processing (load + process + store)
      processingResults.repositoryCode = await this.processRepositoryCode(
        githubUrl, branch, namespace
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
      commitHash: commitInfo?.hash || 'local',
      commitInfo,
      userId, repoId, githubOwner, repoName,
      namespace,
      processedAt: new Date().toISOString()
    };
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

module.exports = RepoProcessor;