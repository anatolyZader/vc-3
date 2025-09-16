/**
 * Enhanced Context Builder for Analytical Queries
 * Provides specialized context formatting for different query types
 */

class AnalyticalContextBuilder {
  constructor() {
    this.sourceTypeWeights = {
      'architecture_documentation': 10,
      'module_documentation': 8,
      'apiSpec': 9,
      'githubCode': 7,
      'configuration': 6
    };
  }

  /**
   * Build context optimized for query analysis results
   */
  buildAnalyticalContext(searchResults, queryAnalysis) {
    const context = {
      originalContext: this.buildStandardContext(searchResults),
      analyticalData: this.extractAnalyticalData(searchResults, queryAnalysis),
      metadata: {
        totalSources: searchResults.length,
        queryIntent: queryAnalysis.intent,
        strategy: queryAnalysis.strategy,
        confidence: queryAnalysis.confidence
      }
    };

    // Apply intent-specific context building
    switch (queryAnalysis.intent) {
      case 'citation':
        context.formatted = this.buildCitationContext(searchResults, queryAnalysis);
        break;
      case 'counting':
        context.formatted = this.buildCountingContext(searchResults, queryAnalysis);
        break;
      case 'comparison':
        context.formatted = this.buildComparisonContext(searchResults, queryAnalysis);
        break;
      case 'listing':
        context.formatted = this.buildListingContext(searchResults, queryAnalysis);
        break;
      case 'implementation':
        context.formatted = this.buildImplementationContext(searchResults, queryAnalysis);
        break;
      case 'architecture':
        context.formatted = this.buildArchitectureContext(searchResults, queryAnalysis);
        break;
      default:
        context.formatted = context.originalContext;
    }

    return context;
  }

  /**
   * Build standard context (fallback)
   */
  buildStandardContext(searchResults) {
    return searchResults
      .map((doc, index) => `[Source ${index + 1}]: ${doc.pageContent}`)
      .join('\n\n');
  }

  /**
   * Extract analytical data from search results
   */
  extractAnalyticalData(searchResults, queryAnalysis) {
    const data = {
      sourceBreakdown: this.analyzeSourceTypes(searchResults),
      fileTypes: this.analyzeFileTypes(searchResults),
      modules: this.analyzeModules(searchResults),
      timestamps: this.analyzeTimestamps(searchResults),
      codeMetrics: this.analyzeCodeMetrics(searchResults)
    };

    // Add query-specific analysis
    if (queryAnalysis.entities.filenames.length > 0) {
      data.requestedFiles = this.findRequestedFiles(searchResults, queryAnalysis.entities.filenames);
    }

    if (queryAnalysis.entities.functions.length > 0) {
      data.requestedFunctions = this.findRequestedFunctions(searchResults, queryAnalysis.entities.functions);
    }

    return data;
  }

  /**
   * Build citation-focused context
   */
  buildCitationContext(searchResults, queryAnalysis) {
    let context = "📚 **SOURCE DOCUMENTATION WITH CITATIONS**\n\n";

    searchResults.forEach((doc, index) => {
      const source = doc.metadata?.source || 'Unknown Source';
      const fileType = doc.metadata?.fileType || 'Unknown';
      const timestamp = doc.metadata?.processedAt || 'Unknown';
      const repo = doc.metadata?.repository || doc.metadata?.repoUrl || 'Local';

      context += `**[${index + 1}] ${source}**\n`;
      context += `📄 Type: ${fileType} | 📅 Last Updated: ${timestamp}\n`;
      context += `🔗 Repository: ${repo}\n`;
      context += `📝 Content:\n${doc.pageContent}\n\n`;
      context += "---\n\n";
    });

    context += `\n📊 **CITATION SUMMARY**\n`;
    context += `Total Sources: ${searchResults.length}\n`;
    context += `File Types: ${[...new Set(searchResults.map(d => d.metadata?.fileType).filter(Boolean))].join(', ')}\n`;

    return context;
  }

  /**
   * Build counting/aggregation-focused context
   */
  buildCountingContext(searchResults, queryAnalysis) {
    const analyticalData = this.extractAnalyticalData(searchResults, queryAnalysis);
    
    let context = "📊 **AGGREGATION ANALYSIS**\n\n";

    // Count by source types
    context += "**By Source Type:**\n";
    Object.entries(analyticalData.sourceBreakdown).forEach(([type, count]) => {
      context += `• ${type}: ${count} items\n`;
    });

    // Count by file types
    context += "\n**By File Type:**\n";
    Object.entries(analyticalData.fileTypes).forEach(([type, count]) => {
      context += `• ${type}: ${count} files\n`;
    });

    // Count by modules
    if (Object.keys(analyticalData.modules).length > 0) {
      context += "\n**By Module:**\n";
      Object.entries(analyticalData.modules).forEach(([module, count]) => {
        context += `• ${module}: ${count} references\n`;
      });
    }

    // Add detailed content for context
    context += "\n📋 **DETAILED CONTENT:**\n\n";
    searchResults.forEach((doc, index) => {
      context += `[${index + 1}] ${doc.metadata?.source || 'Unknown'}: ${doc.pageContent.substring(0, 200)}...\n\n`;
    });

    return context;
  }

  /**
   * Build comparison-focused context
   */
  buildComparisonContext(searchResults, queryAnalysis) {
    // Group results by similarity for comparison
    const grouped = this.groupResultsForComparison(searchResults, queryAnalysis);
    
    let context = "🔍 **COMPARISON ANALYSIS**\n\n";

    Object.entries(grouped).forEach(([category, items]) => {
      context += `**${category.toUpperCase()}:**\n`;
      items.forEach((doc, index) => {
        context += `${index + 1}. ${doc.metadata?.source || 'Unknown'}\n`;
        context += `   ${doc.pageContent.substring(0, 150)}...\n\n`;
      });
      context += "---\n\n";
    });

    return context;
  }

  /**
   * Build listing-focused context
   */
  buildListingContext(searchResults, queryAnalysis) {
    let context = "📋 **COMPREHENSIVE LISTING**\n\n";

    // Create categorized listing
    const categorized = this.categorizeResults(searchResults);

    Object.entries(categorized).forEach(([category, items]) => {
      context += `**${category.toUpperCase()} (${items.length} items):**\n\n`;
      
      items.forEach((doc, index) => {
        const source = doc.metadata?.source || 'Unknown';
        const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ');
        context += `${index + 1}. **${source}**\n   ${preview}...\n\n`;
      });
      
      context += "---\n\n";
    });

    return context;
  }

  /**
   * Build implementation-focused context
   */
  buildImplementationContext(searchResults, queryAnalysis) {
    // Filter and prioritize code chunks
    const codeChunks = searchResults.filter(doc => 
      doc.metadata?.fileType === 'JavaScript' || 
      doc.metadata?.fileType === 'TypeScript' ||
      doc.metadata?.source?.includes('.js') ||
      doc.metadata?.source?.includes('.ts')
    );

    const docChunks = searchResults.filter(doc => 
      !codeChunks.includes(doc)
    );

    let context = "💻 **IMPLEMENTATION ANALYSIS**\n\n";

    if (codeChunks.length > 0) {
      context += "**CODE IMPLEMENTATIONS:**\n\n";
      codeChunks.forEach((doc, index) => {
        context += `**[${index + 1}] ${doc.metadata?.source || 'Unknown'}**\n`;
        context += "```javascript\n";
        context += doc.pageContent;
        context += "\n```\n\n";
      });
    }

    if (docChunks.length > 0) {
      context += "**RELATED DOCUMENTATION:**\n\n";
      docChunks.forEach((doc, index) => {
        context += `[${index + 1}] ${doc.pageContent}\n\n`;
      });
    }

    return context;
  }

  /**
   * Build architecture-focused context
   */
  buildArchitectureContext(searchResults, queryAnalysis) {
    // Prioritize high-level documentation
    const sorted = searchResults.sort((a, b) => {
      const aWeight = this.sourceTypeWeights[a.metadata?.type] || 0;
      const bWeight = this.sourceTypeWeights[b.metadata?.type] || 0;
      return bWeight - aWeight;
    });

    let context = "🏗️ **ARCHITECTURE OVERVIEW**\n\n";

    // Group by architectural level
    const levels = {
      'System Level': [],
      'Module Level': [],
      'Implementation Level': []
    };

    sorted.forEach(doc => {
      if (doc.metadata?.type === 'architecture_documentation' || 
          doc.metadata?.source?.includes('ARCHITECTURE')) {
        levels['System Level'].push(doc);
      } else if (doc.metadata?.type === 'module_documentation') {
        levels['Module Level'].push(doc);
      } else {
        levels['Implementation Level'].push(doc);
      }
    });

    Object.entries(levels).forEach(([level, docs]) => {
      if (docs.length > 0) {
        context += `**${level.toUpperCase()}:**\n\n`;
        docs.forEach((doc, index) => {
          context += `${index + 1}. ${doc.pageContent}\n\n`;
        });
        context += "---\n\n";
      }
    });

    return context;
  }

  // Helper methods for analysis
  analyzeSourceTypes(searchResults) {
    const breakdown = {};
    searchResults.forEach(doc => {
      const type = doc.metadata?.type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return breakdown;
  }

  analyzeFileTypes(searchResults) {
    const breakdown = {};
    searchResults.forEach(doc => {
      const type = doc.metadata?.fileType || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return breakdown;
  }

  analyzeModules(searchResults) {
    const breakdown = {};
    searchResults.forEach(doc => {
      const source = doc.metadata?.source || '';
      const moduleMatch = source.match(/business_modules\/(\w+)/);
      if (moduleMatch) {
        const module = moduleMatch[1];
        breakdown[module] = (breakdown[module] || 0) + 1;
      }
    });
    return breakdown;
  }

  analyzeTimestamps(searchResults) {
    const timestamps = searchResults
      .map(doc => doc.metadata?.processedAt)
      .filter(Boolean)
      .sort();
    
    return {
      earliest: timestamps[0],
      latest: timestamps[timestamps.length - 1],
      count: timestamps.length
    };
  }

  analyzeCodeMetrics(searchResults) {
    const codeChunks = searchResults.filter(doc => 
      doc.metadata?.fileType === 'JavaScript' || 
      doc.metadata?.fileType === 'TypeScript'
    );

    return {
      totalCodeChunks: codeChunks.length,
      avgChunkSize: codeChunks.length > 0 ? 
        Math.round(codeChunks.reduce((sum, doc) => sum + doc.pageContent.length, 0) / codeChunks.length) : 0
    };
  }

  findRequestedFiles(searchResults, requestedFilenames) {
    const found = {};
    requestedFilenames.forEach(filename => {
      found[filename] = searchResults.filter(doc => 
        doc.metadata?.source?.includes(filename)
      );
    });
    return found;
  }

  findRequestedFunctions(searchResults, requestedFunctions) {
    const found = {};
    requestedFunctions.forEach(funcName => {
      found[funcName] = searchResults.filter(doc => 
        doc.pageContent.includes(funcName)
      );
    });
    return found;
  }

  groupResultsForComparison(searchResults, queryAnalysis) {
    // Simple grouping by source type for comparison
    const groups = {};
    searchResults.forEach(doc => {
      const group = doc.metadata?.type || 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(doc);
    });
    return groups;
  }

  categorizeResults(searchResults) {
    const categories = {
      'documentation': [],
      'code': [],
      'configuration': [],
      'other': []
    };

    searchResults.forEach(doc => {
      const source = doc.metadata?.source || '';
      const fileType = doc.metadata?.fileType || '';

      if (source.includes('.md') || doc.metadata?.type?.includes('documentation')) {
        categories.documentation.push(doc);
      } else if (fileType === 'JavaScript' || fileType === 'TypeScript') {
        categories.code.push(doc);
      } else if (source.includes('.json') || source.includes('.yml')) {
        categories.configuration.push(doc);
      } else {
        categories.other.push(doc);
      }
    });

    return categories;
  }
}

module.exports = AnalyticalContextBuilder;