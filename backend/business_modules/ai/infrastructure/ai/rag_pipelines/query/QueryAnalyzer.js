/**
 * Enhanced Query Analyzer for RAG Pipeline
 * Detects query intent and opti    // Architecture-related patterns
    architecture: {
      patterns: [
        /\b(architecture|structure|design|pattern|approach)\b/i,
        /\bhow\s+.*\s+(organized|structured|designed|built)\b/i,
        /\b(modular|layered|hexagonal|clean\s+architecture)\b/i,
        /\b(mvc|mvp|mvvm|ddd)\b/i,
        /\b(di|dependency\s+injection|ioc|inversion\s+of\s+control)\b/i,
        /\bhow\s+.*\s+(di|dependency\s+injection)\b/i,
        /\b(container|injection|dependencies)\b/i
      ],
      confidence: 0.8,
      searchParams: {
        topK: 15,
        threshold: 0.6,
        sourceFilter: ['architecture', 'design', 'di', 'dependency'],
        diversityBoost: true
      }
    },/response strategy accordingly
 */

class QueryAnalyzer {
  constructor() {
    this.queryPatterns = {
      // Citation and reference queries
      citation: {
        patterns: [
          /cite\s+(sources?|references?|docs?|documentation)/i,
          /show\s+(sources?|references?|where)/i,
          /what\s+(files?|documents?|sources?)/i,
          /which\s+(files?|documents?|sources?)/i,
          /from\s+which\s+(file|document|source)/i,
          /reference\s+the\s+(source|file|document)/i
        ],
        strategy: 'citation_focused',
        needsSourceDetails: true
      },

      // Counting and aggregation queries
      counting: {
        patterns: [
          /how\s+many/i,
          /count\s+(of|the)/i,
          /number\s+of/i,
          /total\s+(count|number)/i,
          /occurrences?\s+of/i,
          /instances?\s+of/i,
          /frequency\s+of/i
        ],
        strategy: 'aggregation_focused',
        needsFullScan: true
      },

      // Comparison queries
      comparison: {
        patterns: [
          /compare\s+.+\s+(with|to|and)/i,
          /difference\s+between/i,
          /similarities?\s+between/i,
          /versus|vs\.?/i,
          /contrast\s+.+\s+with/i,
          /what\s+are\s+the\s+differences/i
        ],
        strategy: 'comparison_focused',
        needsMultipleQueries: true
      },

      // List and enumeration queries
      listing: {
        patterns: [
          /list\s+(all|the)/i,
          /show\s+(all|every)/i,
          /enumerate/i,
          /what\s+are\s+(all\s+)?the/i,
          /give\s+me\s+(all|every)/i,
          /find\s+all/i
        ],
        strategy: 'comprehensive_listing',
        needsHighRecall: true
      },

      // Implementation and code analysis
      implementation: {
        patterns: [
          /how\s+(is|does).+implement/i,
          /implementation\s+of/i,
          /code\s+for/i,
          /algorithm\s+for/i,
          /logic\s+behind/i,
          /how\s+does\s+.+\s+work/i
        ],
        strategy: 'code_focused',
        needsCodeChunks: true
      },

      // Architecture and system design
      architecture: {
        patterns: [
          /architecture/i,
          /system\s+design/i,
          /overall\s+structure/i,
          /how\s+.+\s+organized/i,
          /components?\s+of/i,
          /modules?\s+in/i,
          /\b(di|dependency\s+injection|ioc|inversion\s+of\s+control)\b/i,
          /\bhow\s+.*\s+(di|dependency\s+injection)\s+work/i,
          /\b(container|injection|dependencies)\s+(work|used)/i
        ],
        strategy: 'architecture_focused',
        needsHighLevel: true
      }
    };
  }

  /**
   * Analyze query to determine intent and optimal search strategy
   */
  analyzeQuery(query) {
    const analysis = {
      originalQuery: query,
      intent: 'general',
      strategy: 'standard',
      confidence: 0,
      searchParams: this.getDefaultSearchParams(),
      responseModifications: {}
    };

    // Check each pattern category
    for (const [intentType, config] of Object.entries(this.queryPatterns)) {
      const matches = config.patterns.filter(pattern => pattern.test(query));
      
      if (matches.length > 0) {
        const confidence = matches.length / config.patterns.length;
        
        if (confidence > analysis.confidence) {
          analysis.intent = intentType;
          analysis.strategy = config.strategy;
          analysis.confidence = confidence;
          analysis.searchParams = this.getOptimizedSearchParams(config);
          analysis.responseModifications = this.getResponseModifications(config);
        }
      }
    }

    // Extract specific entities from query
    analysis.entities = this.extractEntities(query);
    
    console.log(`[${new Date().toISOString()}] 🎯 QUERY ANALYSIS: Intent="${analysis.intent}", Strategy="${analysis.strategy}", Confidence=${analysis.confidence.toFixed(2)}`);
    
    return analysis;
  }

  /**
   * Get default search parameters
   */
  getDefaultSearchParams() {
    return {
      topK: 10,
      threshold: 0.7,
      includeMetadata: true,
      diversityBoost: false,
      sourceFilter: null
    };
  }

  /**
   * Get optimized search parameters based on query intent
   */
  getOptimizedSearchParams(config) {
    const params = this.getDefaultSearchParams();

    if (config.needsFullScan) {
      params.topK = 50;
      params.threshold = 0.5;
    }

    if (config.needsHighRecall) {
      params.topK = 30;
      params.threshold = 0.6;
      params.diversityBoost = true;
    }

    if (config.needsCodeChunks) {
      params.sourceFilter = (metadata) => {
        return metadata.fileType === 'JavaScript' || 
               metadata.fileType === 'TypeScript' ||
               metadata.source?.includes('.js') ||
               metadata.source?.includes('.ts');
      };
    }

    if (config.needsHighLevel) {
      params.sourceFilter = (metadata) => {
        return metadata.type === 'architecture_documentation' ||
               metadata.type === 'module_documentation' ||
               metadata.source?.includes('ARCHITECTURE') ||
               metadata.source?.includes('README');
      };
    }

    return params;
  }

  /**
   * Get response modifications based on query type
   */
  getResponseModifications(config) {
    const modifications = {};

    if (config.needsSourceDetails) {
      modifications.includeDetailedSources = true;
      modifications.citationFormat = 'academic';
    }

    if (config.needsFullScan) {
      modifications.includeStatistics = true;
      modifications.showCounts = true;
    }

    if (config.needsMultipleQueries) {
      modifications.structuredComparison = true;
    }

    return modifications;
  }

  /**
   * Extract entities (filenames, function names, etc.) from query
   */
  extractEntities(query) {
    const entities = {
      filenames: [],
      functions: [],
      modules: [],
      keywords: []
    };

    // Extract potential filenames
    const filenamePatterns = [
      /(\w+\.(js|ts|json|md|yml|yaml))/gi,
      /`([^`]+\.(js|ts|json|md|yml|yaml))`/gi
    ];

    filenamePatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.filenames.push(...matches.map(m => m.replace(/`/g, '')));
      }
    });

    // Extract potential function names
    const functionPattern = /(\w+)\s*\(/g;
    const functionMatches = query.match(functionPattern);
    if (functionMatches) {
      entities.functions = functionMatches.map(m => m.replace(/\s*\(/, ''));
    }

    // Extract module references
    const modulePatterns = [
      /(\w+)\s+module/gi,
      /`(\w+)`\s+module/gi
    ];

    modulePatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.modules.push(...matches.map(m => m.replace(/\s+module|`/gi, '')));
      }
    });

    return entities;
  }

  /**
   * Generate optimized search queries based on analysis
   */
  generateSearchQueries(analysis) {
    const queries = [analysis.originalQuery];

    // Add entity-specific queries
    if (analysis.entities.filenames.length > 0) {
      analysis.entities.filenames.forEach(filename => {
        queries.push(`${filename} implementation`);
      });
    }

    if (analysis.entities.functions.length > 0) {
      analysis.entities.functions.forEach(func => {
        queries.push(`${func} function definition`);
      });
    }

    if (analysis.entities.modules.length > 0) {
      analysis.entities.modules.forEach(module => {
        queries.push(`${module} module architecture`);
      });
    }

    // Add intent-specific queries
    switch (analysis.intent) {
      case 'counting':
        queries.push('list all instances');
        break;
      case 'comparison':
        queries.push('implementation differences');
        break;
      case 'architecture':
        queries.push('system overview structure');
        break;
    }

    return [...new Set(queries)]; // Remove duplicates
  }
}

module.exports = QueryAnalyzer;