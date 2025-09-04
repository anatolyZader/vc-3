const LoggingManager = require('./LoggingManager');

/**
 * ContextAnalyzer handles document analysis and context formatting
 * Provides clean separation of context processing concerns
 */
class ContextAnalyzer {
  constructor(options = {}) {
    this.logger = new LoggingManager({ component: 'ContextAnalyzer' });
    this.maxContentLength = options.maxContentLength || {
      documentation: 1000,
      code: 500,
      default: 500
    };
  }

  /**
   * Analyzes retrieved documents and formats them into structured context
   */
  analyzeAndFormatContext(documents) {
    const startTime = Date.now();
    this.logger.contextAnalysis('Starting document analysis and context formatting', { 
      documentCount: documents.length 
    });
    
    // Analyze source composition
    const sourceAnalysis = this.analyzeSourceComposition(documents);
    
    // Log comprehensive source analysis
    this.logSourceAnalysis(sourceAnalysis);
    
    // Extract specific metadata
    const moduleDocsUsed = this.extractModuleDocumentation(documents);
    const reposUsed = this.extractRepositoryInfo(documents);
    
    // Log specific usage details
    this.logUsageDetails(moduleDocsUsed, reposUsed);
    
    // Format the context from retrieved documents
    const context = this.formatDocumentsContext(documents);
    
    const sourcesBreakdown = this.createSourcesBreakdown(sourceAnalysis);
    
    const duration = Date.now() - startTime;
    this.logger.performance('Context analysis and formatting', duration, {
      contextLength: context.length,
      sourceTypes: Object.keys(sourcesBreakdown).filter(key => sourcesBreakdown[key]).length
    });
    
    return {
      context,
      sourceAnalysis,
      sourcesBreakdown,
      moduleDocsUsed,
      reposUsed
    };
  }

  /**
   * Analyzes the composition of sources in the retrieved documents
   */
  analyzeSourceComposition(documents) {
    const sourceAnalysis = {
      apiSpec: 0,
      rootDocumentation: 0,
      moduleDocumentation: 0,
      githubRepo: 0,
      total: documents.length
    };
    
    documents.forEach(doc => {
      const type = doc.metadata.type || 'unknown';
      if (type === 'apiSpec' || type === 'apiSpecFull') {
        sourceAnalysis.apiSpec++;
      } else if (type === 'root_documentation') {
        sourceAnalysis.rootDocumentation++;
      } else if (type === 'module_documentation') {
        sourceAnalysis.moduleDocumentation++;
      } else if (doc.metadata.repoId || doc.metadata.githubOwner) {
        sourceAnalysis.githubRepo++;
      }
    });
    
    return sourceAnalysis;
  }

  /**
   * Logs comprehensive source analysis information
   */
  logSourceAnalysis(sourceAnalysis) {
    this.logger.info('RAG SOURCES ANALYSIS: Chat answer will use comprehensive context from multiple sources');
    this.logger.info(`🌐 API Specification: ${sourceAnalysis.apiSpec} chunks`);
    this.logger.info(`📋 Root Documentation (plugins/core): ${sourceAnalysis.rootDocumentation} chunks`);
    this.logger.info(`📁 Module Documentation: ${sourceAnalysis.moduleDocumentation} chunks`);
    this.logger.info(`💻 GitHub Repository Code: ${sourceAnalysis.githubRepo} chunks`);
    
    const activeSourceTypes = Object.values(sourceAnalysis).filter(v => v > 0).length - 1; // -1 for total
    this.logger.info(`📊 TOTAL CONTEXT SOURCES: ${sourceAnalysis.total} chunks from ${activeSourceTypes} different source types`);
  }

  /**
   * Extracts module documentation information
   */
  extractModuleDocumentation(documents) {
    const moduleDocsUsed = documents
      .filter(doc => doc.metadata.type === 'module_documentation')
      .map(doc => doc.metadata.module)
      .filter((module, index, arr) => arr.indexOf(module) === index); // unique modules
    
    return moduleDocsUsed;
  }

  /**
   * Extracts repository information
   */
  extractRepositoryInfo(documents) {
    const reposUsed = documents
      .filter(doc => doc.metadata.repoId)
      .map(doc => `${doc.metadata.githubOwner}/${doc.metadata.repoId}`)
      .filter((repo, index, arr) => arr.indexOf(repo) === index); // unique repos
    
    return reposUsed;
  }

  /**
   * Logs specific usage details for modules and repositories
   */
  logUsageDetails(moduleDocsUsed, reposUsed) {
    if (moduleDocsUsed.length > 0) {
      this.logger.info(`📁 Module docs included: ${moduleDocsUsed.join(', ')}`);
    }
    
    if (reposUsed.length > 0) {
      this.logger.info(`💻 GitHub repos referenced: ${reposUsed.join(', ')}`);
    }
  }

  /**
   * Formats documents into structured context string
   */
  formatDocumentsContext(documents) {
    const context = documents.map((doc) => {
      const source = doc.metadata.source || 'Unknown source';
      const type = doc.metadata.type || 'unknown';
      
      // Add section headers for different types of documentation
      const sectionHeader = this.createSectionHeader(type, doc.metadata);
      
      // Determine appropriate content length based on type
      const maxLength = this.getMaxContentLength(type);
      const content = this.truncateContent(doc.pageContent, maxLength);
        
      return `${sectionHeader}File: ${source}\n${content}`;
    }).join('\n\n');
    
    this.logger.debug('Created context from documents', {
      contextLength: context.length,
      documentCount: documents.length
    });
    
    return context;
  }

  /**
   * Creates appropriate section header based on document type
   */
  createSectionHeader(type, metadata) {
    if (type === 'apiSpec' || type === 'apiSpecFull') {
      return '=== API SPECIFICATION ===\n';
    } else if (type === 'root_documentation') {
      return '=== ROOT DOCUMENTATION (Plugins & Core Files) ===\n';
    } else if (type === 'module_documentation') {
      return `=== ${metadata.module?.toUpperCase() || 'MODULE'} DOCUMENTATION ===\n`;
    } else if (metadata.repoId) {
      return `=== CODE REPOSITORY (${metadata.source || 'Unknown'}) ===\n`;
    }
    return '=== DOCUMENT ===\n';
  }

  /**
   * Gets maximum content length based on document type
   */
  getMaxContentLength(type) {
    if (type.includes('documentation')) {
      return this.maxContentLength.documentation;
    } else if (type.includes('code') || type.includes('repo')) {
      return this.maxContentLength.code;
    }
    return this.maxContentLength.default;
  }

  /**
   * Truncates content to specified length with ellipsis
   */
  truncateContent(content, maxLength) {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
  }

  /**
   * Creates a breakdown of source types for easier consumption
   */
  createSourcesBreakdown(sourceAnalysis) {
    return {
      hasApiSpec: sourceAnalysis.apiSpec > 0,
      hasRootDocs: sourceAnalysis.rootDocumentation > 0,
      hasModuleDocs: sourceAnalysis.moduleDocumentation > 0,
      hasGithubCode: sourceAnalysis.githubRepo > 0
    };
  }
}

module.exports = ContextAnalyzer;