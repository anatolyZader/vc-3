// DocumentProcessor.js
"use strict";

const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

/**
 * DocumentProcessor handles document processing utilities and intelligent splitting
 * Extracted methods from aiLangchainAdapter.js for better separation of concerns
 */
class DocumentProcessor {
  constructor(options = {}) {
    this.semanticPreprocessor = options.semanticPreprocessor;
    this.astCodeSplitter = options.astCodeSplitter;
    this.repositoryManager = options.repositoryManager;
  }

  /**
   * Create an intelligent text splitter based on document content and language
   * Moved from aiLangchainAdapter.js for better separation of concerns
   */
  async createSmartSplitter(documents) {
    console.log(`[${new Date().toISOString()}] 🔍 SMART SPLITTING: Creating intelligent text splitter based on document content analysis`);
    console.log(`[${new Date().toISOString()}] 📋 PROCESS: Analyzing ${documents.length} documents to determine optimal splitting strategy`);
    
    if (!documents || documents.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ WARNING: No documents provided, using default splitter`);
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

    console.log(`[${new Date().toISOString()}] 📊 ANALYSIS: Code files: ${hasCodeFiles ? 'Yes' : 'No'}, Markdown files: ${hasMarkdownFiles ? 'Yes' : 'No'}`);

    if (hasCodeFiles) {
      // Detect primary language
      const languages = documents
        .map(doc => doc.metadata?.source?.split('.').pop()?.toLowerCase())
        .filter(Boolean);
      
      const primaryLanguage = this.getMostCommonLanguage(languages);
      console.log(`[${new Date().toISOString()}] 🔧 SMART SPLITTING: Using ${primaryLanguage}-aware separators for better code chunking`);
      
      return new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 300,
        separators: this.getCodeAwareSeparators(primaryLanguage)
      });
    }

    if (hasMarkdownFiles) {
      console.log(`[${new Date().toISOString()}] 📝 SMART SPLITTING: Using markdown-aware separators for documentation`);
      return new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 250,
        separators: this.getCodeAwareSeparators('markdown')
      });
    }

    console.log(`[${new Date().toISOString()}] 📝 SMART SPLITTING: Using standard text splitter for general documents`);
    return new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 250
    });
  }

  /**
   * Get code-aware separators based on programming language
   * Moved from aiLangchainAdapter.js for better separation of concerns
   */
  getCodeAwareSeparators(language) {
    console.log(`[${new Date().toISOString()}] 🔍 SEPARATORS: Getting language-specific separators for ${language}`);
    
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
    console.log(`[${new Date().toISOString()}] 🔧 SEPARATORS: Using ${separators.length} separators for ${language}: [${separators.slice(0, 3).join(', ')}...]`);
    
    return separators;
  }

  /**
   * Helper method to determine most common language from file extensions
   */
  getMostCommonLanguage(languages) {
    const languageCount = languages.reduce((acc, lang) => {
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});
    
    const mostCommon = Object.keys(languageCount).reduce((a, b) => 
      languageCount[a] > languageCount[b] ? a : b
    ) || 'javascript';
    
    console.log(`[${new Date().toISOString()}] 📊 LANGUAGE ANALYSIS: Most common language: ${mostCommon} (${languageCount[mostCommon]} files)`);
    return mostCommon;
  }

  /**
   * Legacy method for loading and processing repository documents
   */
  async loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 📚 LEGACY DOCUMENT PROCESSOR: Loading repository documents`);
    
    try {
      // This is a placeholder for the legacy document loading logic
      // The actual repository processing is now handled by RepositoryProcessor
      return {
        success: true,
        documents: [],
        message: 'Legacy method - actual processing delegated to specialized processors'
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ LEGACY DOCUMENT PROCESSOR: Error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Legacy method for processing documents
   */
  async processDocuments(documents, repoId, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 📚 LEGACY DOCUMENT PROCESSOR: Processing ${documents.length} documents`);
    return documents; // Pass-through for backward compatibility
  }

  /**
   * Legacy method for intelligent document splitting
   */
  async intelligentSplitDocuments(documents) {
    console.log(`[${new Date().toISOString()}] ✂️ LEGACY DOCUMENT PROCESSOR: Splitting ${documents.length} documents`);
    
    if (this.astCodeSplitter) {
      try {
        const splitDocs = [];
        for (const doc of documents) {
          const chunks = await this.astCodeSplitter.splitDocument(doc);
          splitDocs.push(...chunks);
        }
        return splitDocs;
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ LEGACY: AST splitting failed, using createSmartSplitter as fallback`);
        
        // Use the new smart splitter as fallback
        const smartSplitter = await this.createSmartSplitter(documents);
        return await smartSplitter.splitDocuments(documents);
      }
    }

    // Use smart splitter for better splitting
    const smartSplitter = await this.createSmartSplitter(documents);
    return await smartSplitter.splitDocuments(documents);
  }

  /**
   * Legacy method for logging processing pipeline summary
   */
  logProcessingPipelineSummary(ubiqLanguageDocs, semanticallyEnhancedDocs) {
    console.log(`[${new Date().toISOString()}] 📊 LEGACY PROCESSING SUMMARY:`);
    console.log(`[${new Date().toISOString()}]    Ubiquitous Language Enhanced: ${ubiqLanguageDocs.length} documents`);
    console.log(`[${new Date().toISOString()}]    Semantically Enhanced: ${semanticallyEnhancedDocs.length} documents`);
  }
}

module.exports = DocumentProcessor;
