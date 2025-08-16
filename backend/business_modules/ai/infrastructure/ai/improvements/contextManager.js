// Context Optimization and Management for Production RAG
'use strict';

class ContextManager {
  constructor({ maxTokens = 16000, llm = null }) {
    this.maxTokens = maxTokens;
    this.llm = llm;
    
    // Token estimation (rough approximation: 1 token ≈ 4 characters)
    this.tokensPerChar = 1 / 4;
    
    // Reserve tokens for different parts
    this.reservedTokens = {
      systemPrompt: 800,
      userQuery: 500,
      conversationHistory: 2000,
      response: 2000
    };
    
    this.availableTokensForContext = this.maxTokens - Object.values(this.reservedTokens).reduce((a, b) => a + b, 0);
  }

  // 1. Intelligent Context Selection and Ranking
  async optimizeContext(retrievedDocuments, processedQuery, conversationHistory = []) {
    console.log(`📋 CONTEXT OPTIMIZATION: Processing ${retrievedDocuments.length} retrieved documents`);

    // Step 1: Score and rank documents by relevance
    const scoredDocuments = await this.scoreDocuments(retrievedDocuments, processedQuery, conversationHistory);
    
    // Step 2: Select optimal subset within token limits
    const selectedDocuments = this.selectOptimalDocuments(scoredDocuments, processedQuery);
    
    // Step 3: Organize and structure the context
    const structuredContext = this.structureContext(selectedDocuments, processedQuery);
    
    // Step 4: Create hierarchical context with summaries
    const hierarchicalContext = await this.createHierarchicalContext(structuredContext, processedQuery);
    
    console.log(`📋 CONTEXT OPTIMIZATION: Selected ${selectedDocuments.length} documents (${this.estimateTokens(hierarchicalContext.fullContext)} tokens)`);
    
    return {
      fullContext: hierarchicalContext.fullContext,
      summary: hierarchicalContext.summary,
      selectedDocuments,
      contextMetadata: {
        totalDocuments: retrievedDocuments.length,
        selectedDocuments: selectedDocuments.length,
        estimatedTokens: this.estimateTokens(hierarchicalContext.fullContext),
        sourceBreakdown: this.analyzeSourceBreakdown(selectedDocuments),
        contextStrategy: hierarchicalContext.strategy
      }
    };
  }

  // Score documents based on multiple relevance factors
  async scoreDocuments(documents, processedQuery, conversationHistory) {
    const classification = processedQuery.classification;
    const keywords = classification.keywords.map(k => k.toLowerCase());
    
    return documents.map(doc => {
      let score = doc.finalScore || doc.score || 0;
      
      // Factor 1: Keyword relevance
      const keywordScore = this.calculateKeywordRelevance(doc.pageContent, keywords);
      score += keywordScore * 0.3;
      
      // Factor 2: Source type relevance based on query category
      const sourceTypeScore = this.calculateSourceTypeRelevance(doc, classification);
      score += sourceTypeScore * 0.2;
      
      // Factor 3: Content freshness and quality
      const qualityScore = this.calculateContentQuality(doc);
      score += qualityScore * 0.15;
      
      // Factor 4: Conversation context relevance
      const contextScore = this.calculateContextRelevance(doc, conversationHistory);
      score += contextScore * 0.15;
      
      // Factor 5: Content completeness
      const completenessScore = this.calculateContentCompleteness(doc, classification);
      score += completenessScore * 0.1;
      
      // Factor 6: Cross-reference value
      const crossRefScore = this.calculateCrossReferenceValue(doc, documents);
      score += crossRefScore * 0.1;

      return {
        ...doc,
        relevanceScore: score,
        scoringDetails: {
          keywordScore,
          sourceTypeScore,
          qualityScore,
          contextScore,
          completenessScore,
          crossRefScore
        }
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Calculate keyword relevance score
  calculateKeywordRelevance(content, keywords) {
    const contentLower = content.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = (content.match(regex) || []).length;
      score += Math.min(matches * 0.1, 0.5); // Cap individual keyword contribution
    });
    
    return Math.min(score, 1.0);
  }

  // Calculate source type relevance based on query classification
  calculateSourceTypeRelevance(doc, classification) {
    const sourceType = doc.metadata?.type || 'unknown';
    const category = classification.primary_category;
    
    const relevanceMap = {
      'API_USAGE': {
        'apiSpec': 1.0,
        'apiSpecFull': 1.0,
        'apiSpecEndpoints': 0.9,
        'root_documentation': 0.4,
        'module_documentation': 0.3,
        'githubCode': 0.2
      },
      'CODE_IMPLEMENTATION': {
        'githubCode': 1.0,
        'module_documentation': 0.7,
        'root_documentation': 0.4,
        'apiSpec': 0.3
      },
      'ARCHITECTURE': {
        'root_documentation': 1.0,
        'architecture_documentation': 1.0,
        'module_documentation': 0.6,
        'apiSpec': 0.4,
        'githubCode': 0.3
      },
      'DEBUGGING': {
        'githubCode': 1.0,
        'module_documentation': 0.8,
        'root_documentation': 0.6,
        'apiSpec': 0.4
      },
      'DOCUMENTATION': {
        'root_documentation': 1.0,
        'module_documentation': 1.0,
        'architecture_documentation': 0.9,
        'apiSpec': 0.7,
        'githubCode': 0.4
      }
    };

    const categoryMap = relevanceMap[category] || {};
    return categoryMap[sourceType] || 0.5;
  }

  // Calculate content quality score
  calculateContentQuality(doc) {
    const content = doc.pageContent;
    let score = 0.5; // Base score
    
    // Length consideration (not too short, not too long)
    const length = content.length;
    if (length > 100 && length < 2000) score += 0.2;
    else if (length >= 2000 && length < 5000) score += 0.1;
    
    // Code presence for technical queries
    if (/```|function\s+\w+|class\s+\w+|const\s+\w+|export/.test(content)) {
      score += 0.15;
    }
    
    // Documentation structure
    if (/#{1,3}\s+\w+|\*\*\w+\*\*|^\s*\d+\./m.test(content)) {
      score += 0.1;
    }
    
    // Comments and explanations
    if (/(\/\/|#|<!--)/.test(content)) {
      score += 0.05;
    }
    
    return Math.min(score, 1.0);
  }

  // Calculate relevance to conversation context
  calculateContextRelevance(doc, conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) return 0;
    
    // Extract terms from recent conversation
    const recentTerms = conversationHistory
      .slice(-2) // Last 2 exchanges
      .flatMap(exchange => [
        ...exchange.prompt.split(/\W+/),
        ...exchange.response.split(/\W+/)
      ])
      .filter(term => term.length > 3)
      .map(term => term.toLowerCase());
    
    const contentLower = doc.pageContent.toLowerCase();
    const matchingTerms = recentTerms.filter(term => contentLower.includes(term));
    
    return Math.min(matchingTerms.length / Math.max(recentTerms.length, 1) * 0.5, 1.0);
  }

  // Calculate content completeness based on query requirements
  calculateContentCompleteness(doc, classification) {
    const content = doc.pageContent;
    let score = 0.5;
    
    if (classification.requires_code_examples) {
      // Check for code examples
      if (/```[\s\S]*?```|function\s*\(|=>\s*{|\w+\.\w+\(/.test(content)) {
        score += 0.3;
      }
    }
    
    // Check for explanations
    if (/\b(how|why|what|when|where)\b/i.test(content)) {
      score += 0.1;
    }
    
    // Check for examples
    if (/\b(example|sample|demo|usage)\b/i.test(content)) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  // Calculate cross-reference value
  calculateCrossReferenceValue(doc, allDocuments) {
    const source = doc.metadata?.source || '';
    const referencingDocs = allDocuments.filter(other => 
      other !== doc && (
        other.pageContent.includes(source) ||
        (doc.metadata?.module && other.pageContent.includes(doc.metadata.module))
      )
    );
    
    return Math.min(referencingDocs.length * 0.1, 0.3);
  }

  // Select optimal subset of documents within token constraints
  selectOptimalDocuments(scoredDocuments, processedQuery) {
    const selected = [];
    let currentTokens = 0;
    const maxContextTokens = this.availableTokensForContext;
    
    // Ensure we have at least one high-quality document from each important source type
    const sourceTypes = ['apiSpec', 'root_documentation', 'module_documentation', 'githubCode'];
    const guaranteedDocs = [];
    
    sourceTypes.forEach(type => {
      const bestOfType = scoredDocuments.find(doc => 
        (doc.metadata?.type || '').includes(type) && !guaranteedDocs.includes(doc)
      );
      if (bestOfType) {
        guaranteedDocs.push(bestOfType);
      }
    });
    
    // Add guaranteed documents first
    for (const doc of guaranteedDocs) {
      const docTokens = this.estimateTokens(doc.pageContent);
      if (currentTokens + docTokens <= maxContextTokens) {
        selected.push(doc);
        currentTokens += docTokens;
      }
    }
    
    // Add remaining documents by relevance score
    for (const doc of scoredDocuments) {
      if (selected.includes(doc)) continue;
      
      const docTokens = this.estimateTokens(doc.pageContent);
      if (currentTokens + docTokens <= maxContextTokens) {
        selected.push(doc);
        currentTokens += docTokens;
      } else {
        // Try to include a truncated version if it's highly relevant
        if (doc.relevanceScore > 0.8) {
          const availableTokens = maxContextTokens - currentTokens;
          const truncatedContent = this.truncateContent(doc.pageContent, availableTokens);
          if (truncatedContent.length > 100) { // Only if we can keep meaningful content
            selected.push({
              ...doc,
              pageContent: truncatedContent,
              metadata: { ...doc.metadata, truncated: true }
            });
            break; // Stop after adding truncated content
          }
        }
      }
    }
    
    return selected;
  }

  // Structure context in a logical order
  structureContext(documents, processedQuery) {
    const classification = processedQuery.classification;
    
    // Group documents by type and importance
    const grouped = {
      apiSpec: documents.filter(doc => (doc.metadata?.type || '').includes('apiSpec')),
      rootDocs: documents.filter(doc => doc.metadata?.type === 'root_documentation'),
      moduleDocs: documents.filter(doc => doc.metadata?.type === 'module_documentation'),
      code: documents.filter(doc => doc.metadata?.repoId || doc.metadata?.githubOwner),
      other: documents.filter(doc => !['apiSpec', 'root_documentation', 'module_documentation'].some(type => 
        (doc.metadata?.type || '').includes(type)) && !doc.metadata?.repoId && !doc.metadata?.githubOwner)
    };
    
    // Order based on query category
    let orderedGroups;
    switch (classification.primary_category) {
      case 'API_USAGE':
        orderedGroups = ['apiSpec', 'rootDocs', 'moduleDocs', 'code', 'other'];
        break;
      case 'CODE_IMPLEMENTATION':
        orderedGroups = ['code', 'moduleDocs', 'apiSpec', 'rootDocs', 'other'];
        break;
      case 'ARCHITECTURE':
        orderedGroups = ['rootDocs', 'moduleDocs', 'apiSpec', 'code', 'other'];
        break;
      default:
        orderedGroups = ['rootDocs', 'apiSpec', 'moduleDocs', 'code', 'other'];
    }
    
    const orderedDocuments = [];
    orderedGroups.forEach(groupName => {
      orderedDocuments.push(...grouped[groupName]);
    });
    
    return orderedDocuments;
  }

  // Create hierarchical context with summaries
  async createHierarchicalContext(structuredDocuments, processedQuery) {
    const sections = [];
    let currentSection = null;
    let strategy = 'full'; // full, summarized, or mixed
    
    const totalTokens = structuredDocuments.reduce((sum, doc) => 
      sum + this.estimateTokens(doc.pageContent), 0
    );
    
    // Decide on context strategy
    if (totalTokens > this.availableTokensForContext * 0.8) {
      strategy = 'mixed'; // Use summaries for some sections
      if (totalTokens > this.availableTokensForContext * 1.2) {
        strategy = 'summarized'; // Use summaries for most content
      }
    }
    
    for (const doc of structuredDocuments) {
      const source = doc.metadata?.source || 'Unknown';
      const type = doc.metadata?.type || 'unknown';
      
      // Create section header
      const sectionHeader = this.createSectionHeader(doc, type);
      
      // Determine if this document should be summarized
      const shouldSummarize = strategy === 'summarized' || 
        (strategy === 'mixed' && doc.relevanceScore < 0.6);
      
      let content = doc.pageContent;
      if (shouldSummarize && this.llm && content.length > 500) {
        try {
          content = await this.summarizeContent(content, processedQuery);
        } catch (error) {
          console.warn(`Failed to summarize content from ${source}:`, error.message);
          // Fallback to truncation
          content = this.truncateContent(content, 200);
        }
      }
      
      sections.push({
        header: sectionHeader,
        content: content,
        metadata: doc.metadata,
        relevanceScore: doc.relevanceScore,
        summarized: shouldSummarize && content !== doc.pageContent
      });
    }
    
    // Build full context
    const fullContext = sections.map(section => 
      `${section.header}\n${section.content}`
    ).join('\n\n---\n\n');
    
    // Create an overall summary
    const summary = this.createContextSummary(sections, processedQuery);
    
    return {
      fullContext,
      summary,
      sections,
      strategy,
      metadata: {
        totalSections: sections.length,
        summarizedSections: sections.filter(s => s.summarized).length,
        estimatedTokens: this.estimateTokens(fullContext)
      }
    };
  }

  // Create appropriate section header based on document type
  createSectionHeader(doc, type) {
    const source = doc.metadata?.source || 'Unknown';
    
    switch (type) {
      case 'apiSpec':
      case 'apiSpecFull':
        return '=== API SPECIFICATION ===';
      case 'apiSpecEndpoints':
        return '=== API ENDPOINTS ===';
      case 'root_documentation':
        return '=== CORE DOCUMENTATION ===';
      case 'module_documentation':
        return `=== ${(doc.metadata?.module || 'MODULE').toUpperCase()} DOCUMENTATION ===`;
      case 'architecture_documentation':
        return '=== ARCHITECTURE DOCUMENTATION ===';
      default:
        if (doc.metadata?.repoId) {
          return `=== CODE: ${source} ===`;
        }
        return `=== REFERENCE: ${source} ===`;
    }
  }

  // Summarize content using LLM
  async summarizeContent(content, processedQuery) {
    const summaryPrompt = `
    Summarize the following technical content in the context of this user query: "${processedQuery.originalQuery}"
    
    Focus on:
    1. Key technical concepts and implementations
    2. Important code examples or patterns
    3. Relevant API endpoints or functions
    4. Critical configuration or setup information
    
    Keep the summary detailed enough to be useful but concise. Preserve any code snippets that are directly relevant.
    
    Content to summarize:
    ${content}
    
    Summary:
    `;

    const result = await this.llm.invoke([{ role: "user", content: summaryPrompt }]);
    return result.content;
  }

  // Create overall context summary
  createContextSummary(sections, processedQuery) {
    const sourceTypes = [...new Set(sections.map(s => s.metadata?.type || 'unknown'))];
    const totalSources = sections.length;
    const summarizedCount = sections.filter(s => s.summarized).length;
    
    let summary = `Context Summary for: "${processedQuery.originalQuery}"\n\n`;
    summary += `📊 Total Sources: ${totalSources}\n`;
    summary += `📝 Source Types: ${sourceTypes.join(', ')}\n`;
    if (summarizedCount > 0) {
      summary += `📋 Summarized: ${summarizedCount} sections\n`;
    }
    summary += `🎯 Query Category: ${processedQuery.classification.primary_category}\n\n`;
    
    summary += 'Key Sources:\n';
    sections.slice(0, 5).forEach((section, index) => {
      summary += `${index + 1}. ${section.metadata?.source || 'Unknown'} (Relevance: ${(section.relevanceScore * 100).toFixed(0)}%)\n`;
    });
    
    return summary;
  }

  // Utility methods
  estimateTokens(text) {
    return Math.ceil(text.length * this.tokensPerChar);
  }

  truncateContent(content, maxTokens) {
    const maxChars = Math.floor(maxTokens / this.tokensPerChar);
    if (content.length <= maxChars) return content;
    
    // Try to truncate at a natural break point
    const truncated = content.substring(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    const lastSentence = truncated.lastIndexOf('.');
    
    let breakPoint = maxChars;
    if (lastNewline > maxChars * 0.8) breakPoint = lastNewline;
    else if (lastSentence > maxChars * 0.8) breakPoint = lastSentence + 1;
    
    return content.substring(0, breakPoint) + '\n\n[Content truncated for length...]';
  }

  analyzeSourceBreakdown(documents) {
    const breakdown = {};
    documents.forEach(doc => {
      const type = doc.metadata?.type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return breakdown;
  }
}

module.exports = ContextManager;
