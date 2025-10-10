class ContextBuilder {
  static analyzeDocuments(documents) {
    const sourceAnalysis = {
      apiSpec: 0,
      rootDocumentation: 0,
      moduleDocumentation: 0,
      githubRepo: 0,
      total: documents.length
    };

    documents.forEach(doc => {
      const type = doc.metadata.type || 'unknown';
      if (type === 'apiSpec' || type === 'apiSpecFull') sourceAnalysis.apiSpec++;
      else if (type === 'root_documentation') sourceAnalysis.rootDocumentation++;
      else if (type === 'module_documentation') sourceAnalysis.moduleDocumentation++;
      else if (doc.metadata.repoId || doc.metadata.githubOwner) sourceAnalysis.githubRepo++;
    });

    return sourceAnalysis;
  }

  static formatContext(documents) {
    console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Found ${documents.length} relevant documents`);
    console.log(`[${new Date().toISOString()}] 📚 MULTI-SOURCE RAG CONTEXT FROM VECTOR SEARCH:`);
    console.log(`[${new Date().toISOString()}] 🎯 TOTAL CONTEXT: ${documents.length} chunks retrieved from vector database ready for AI processing`);

    const sourceAnalysis = this.analyzeDocuments(documents);
    this.logSourceAnalysis(sourceAnalysis, documents);

    const context = documents.map((doc, index) => {
      return this.formatDocument(doc);
    }).join('\n\n');

    console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Created context with ${context.length} characters from ${documents.length} documents`);

    const sourcesBreakdown = {
      hasApiSpec: sourceAnalysis.apiSpec > 0,
      hasRootDocs: sourceAnalysis.rootDocumentation > 0,
      hasModuleDocs: sourceAnalysis.moduleDocumentation > 0,
      hasGithubCode: sourceAnalysis.githubRepo > 0
    };

    return {
      context,
      sourceAnalysis,
      sourcesBreakdown,
      moduleDocsUsed: this.extractModuleDocsUsed(documents),
      reposUsed: this.extractReposUsed(documents)
    };
  }

  static formatDocument(doc) {
    const source = doc.metadata.source || 'Unknown source';
    const type = doc.metadata.type || 'unknown';
    
    const sectionHeader = this.getSectionHeader(type, doc, source);
    
    // Increase limits for better code access - documentation gets 1500, code gets 1200 characters
    const maxLength = type.includes('documentation') ? 1500 : 1200;
    const content = doc.pageContent.length > maxLength 
      ? doc.pageContent.substring(0, maxLength) + '...' 
      : doc.pageContent;
      
    return `${sectionHeader}File: ${source}\n${content}`;
  }

  static getSectionHeader(type, doc, source) {
    if (type === 'apiSpec' || type === 'apiSpecFull') {
      return '=== API SPECIFICATION ===\n';
    } else if (type === 'root_documentation') {
      return '=== ROOT DOCUMENTATION (Plugins & Core Files) ===\n';
    } else if (type === 'module_documentation') {
      return `=== ${doc.metadata.module?.toUpperCase() || 'MODULE'} DOCUMENTATION ===\n`;
    } else if (doc.metadata.repoId) {
      return `=== ACTUAL SOURCE CODE FROM REPOSITORY (${source}) ===\nNote: This contains the actual source code from the file.\n`;
    }
    return '';
  }

  static extractModuleDocsUsed(documents) {
    return documents
      .filter(doc => doc.metadata.type === 'module_documentation')
      .map(doc => doc.metadata.module)
      .filter((module, index, arr) => arr.indexOf(module) === index);
  }

  static extractReposUsed(documents) {
    return documents
      .filter(doc => doc.metadata.repoId)
      .map(doc => `${doc.metadata.githubOwner}/${doc.metadata.repoId}`)
      .filter((repo, index, arr) => arr.indexOf(repo) === index);
  }

  static logSourceAnalysis(sourceAnalysis, documents) {
    console.log(`[${new Date().toISOString()}] 🔍 RAG SOURCES ANALYSIS: Chat answer will use comprehensive context from multiple sources:`);
    console.log(`[${new Date().toISOString()}] 🌐 API Specification: ${sourceAnalysis.apiSpec} chunks`);
    console.log(`[${new Date().toISOString()}] 📋 Root Documentation (plugins/core): ${sourceAnalysis.rootDocumentation} chunks`);
    console.log(`[${new Date().toISOString()}] 📁 Module Documentation: ${sourceAnalysis.moduleDocumentation} chunks`);
    console.log(`[${new Date().toISOString()}] 💻 GitHub Repository Code: ${sourceAnalysis.githubRepo} chunks`);
    console.log(`[${new Date().toISOString()}] 📊 TOTAL CONTEXT SOURCES: ${sourceAnalysis.total} chunks from ${Object.values(sourceAnalysis).filter(v => v > 0).length - 1} different source types`);
    
    // Log specific module documentation being used
    const moduleDocsUsed = documents
      .filter(doc => doc.metadata.type === 'module_documentation')
      .map(doc => doc.metadata.module)
      .filter((module, index, arr) => arr.indexOf(module) === index);
    
    if (moduleDocsUsed.length > 0) {
      console.log(`[${new Date().toISOString()}] 📁 Module docs included: ${moduleDocsUsed.join(', ')}`);
    }
    
    // Log GitHub repositories being used
    const reposUsed = documents
      .filter(doc => doc.metadata.repoId)
      .map(doc => `${doc.metadata.githubOwner}/${doc.metadata.repoId}`)
      .filter((repo, index, arr) => arr.indexOf(repo) === index);
    
    if (reposUsed.length > 0) {
      console.log(`[${new Date().toISOString()}] 💻 GitHub repos referenced: ${reposUsed.join(', ')}`);
    }
  }
}

module.exports = ContextBuilder;
