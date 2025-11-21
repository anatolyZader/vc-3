class ContextBuilder {
  static analyzeDocuments(documents) {
    const sourceAnalysis = {
      apiSpec: 0,
      rootDocumentation: 0,
      moduleDocumentation: 0,
      githubCode: 0,        // Implementation code
      githubDocs: 0,        // Documentation files
      githubTest: 0,        // Test files
      githubConfig: 0,      // Configuration files
      githubCatalog: 0,     // Catalog files (should be 0 if filtered)
      githubLegacy: 0,      // Legacy github-file type
      total: documents.length
    };

    documents.forEach(doc => {
      const type = doc.metadata.type || 'unknown';
      
      switch (type) {
        case 'apiSpec':
        case 'apiSpecFull':
          sourceAnalysis.apiSpec++;
          break;
        case 'root_documentation':
        case 'architecture_documentation':
          sourceAnalysis.rootDocumentation++;
          break;
        case 'module_documentation':
          sourceAnalysis.moduleDocumentation++;
          break;
        case 'github-code':
          sourceAnalysis.githubCode++;
          break;
        case 'github-docs':
          sourceAnalysis.githubDocs++;
          break;
        case 'github-test':
          sourceAnalysis.githubTest++;
          break;
        case 'github-config':
          sourceAnalysis.githubConfig++;
          break;
        case 'github-catalog':
          sourceAnalysis.githubCatalog++;
          break;
        default:
          // Legacy handling for old 'github-file' type
          if (type === 'github-file' || type === 'github-file-code' || type === 'github-file-json') {
            sourceAnalysis.githubLegacy++;
          } else if (doc.metadata?.source?.includes('github.com') || doc.metadata?.repoId) {
            sourceAnalysis.githubCode++;  // Assume code for unknown GitHub files
          }
      }
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
      hasGithubCode: sourceAnalysis.githubCode > 0,
      hasGithubDocs: sourceAnalysis.githubDocs > 0,
      hasGithubTest: sourceAnalysis.githubTest > 0,
      hasGithubConfig: sourceAnalysis.githubConfig > 0
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
      
    // Enhanced formatting with clear emphasis on actual code content
    const formattedContent = `${sectionHeader}📁 File: ${source}
🔍 Content Type: ${type}
📋 Content Length: ${content.length} characters

💻 ACTUAL CONTENT:
${content}`;
    
    return formattedContent;
  }

  static getSectionHeader(type, doc, source) {
    if (type === 'apiSpec' || type === 'apiSpecFull') {
      return '🌐 === API SPECIFICATION ===\n⚡ REAL API ENDPOINTS AND SCHEMAS FROM YOUR APPLICATION\n\n';
    } else if (type === 'root_documentation') {
      return '📋 === ROOT DOCUMENTATION (Plugins & Core Files) ===\n⚡ ACTUAL CONFIGURATION AND PLUGIN DOCUMENTATION\n\n';
    } else if (type === 'module_documentation') {
      return `📁 === ${doc.metadata.module?.toUpperCase() || 'MODULE'} DOCUMENTATION ===\n⚡ REAL MODULE DOCUMENTATION FROM YOUR APPLICATION\n\n`;
    } else if (doc.metadata.repoId) {
      return `💻 === ACTUAL SOURCE CODE FROM REPOSITORY (${source}) ===\n⚡ THIS IS REAL CODE FROM YOUR CODEBASE - NOT EXAMPLES\n⚡ Repository: ${doc.metadata.githubOwner}/${doc.metadata.repoId}\n\n`;
    }
    return '📄 === DOCUMENT CONTENT ===\n⚡ ACTUAL CONTENT FROM YOUR APPLICATION\n\n';
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
    console.log(`[${new Date().toISOString()}] 💻 GitHub Code Files: ${sourceAnalysis.githubCode} chunks`);
    console.log(`[${new Date().toISOString()}] 📖 GitHub Documentation: ${sourceAnalysis.githubDocs} chunks`);
    console.log(`[${new Date().toISOString()}] 🧪 GitHub Test Files: ${sourceAnalysis.githubTest} chunks`);
    console.log(`[${new Date().toISOString()}] ⚙️  GitHub Config Files: ${sourceAnalysis.githubConfig} chunks`);
    
    if (sourceAnalysis.githubLegacy > 0) {
      console.log(`[${new Date().toISOString()}] 📦 Legacy GitHub Files: ${sourceAnalysis.githubLegacy} chunks (need re-indexing)`);
    }
    
    if (sourceAnalysis.githubCatalog > 0) {
      console.warn(`[${new Date().toISOString()}] ⚠️  WARNING: ${sourceAnalysis.githubCatalog} catalog files included (should be filtered)`);
    }
    
    console.log(`[${new Date().toISOString()}] 📊 TOTAL CONTEXT SOURCES: ${sourceAnalysis.total} chunks from multiple source types`);
    
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
      .filter(doc => doc.metadata.repoId || doc.metadata.type?.startsWith('github-'))
      .map(doc => {
        const repoId = doc.metadata.repoId;
        
        // If repoId is already in owner/repo format and doesn't contain "undefined"
        if (repoId && repoId.includes('/') && !repoId.includes('undefined')) {
          return repoId; // Already has clean owner/repo format
        }
        
        // Enhanced fallback: construct from metadata with undefined safety
        const owner = doc.metadata.repoOwner || 
                     (doc.metadata.githubOwner && doc.metadata.githubOwner !== 'undefined' ? doc.metadata.githubOwner : null) || 
                     'anatolyZader';
        
        const repo = doc.metadata.repoName || 
                    (repoId && !repoId.includes('/') ? repoId : null) || 
                    'vc-3';
        
        return `${owner}/${repo}`;
      })
      .filter((repo, index, arr) => arr.indexOf(repo) === index && !repo.includes('undefined'));
    
    if (reposUsed.length > 0) {
      console.log(`[${new Date().toISOString()}] 💻 GitHub repos referenced: ${reposUsed.join(', ')}`);
    }
  }
}

module.exports = ContextBuilder;
