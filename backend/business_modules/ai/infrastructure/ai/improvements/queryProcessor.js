// Production-level Query Processor for RAG Pipeline
'use strict';

class QueryProcessor {
  constructor({ llm, embeddings }) {
    this.llm = llm;
    this.embeddings = embeddings;
  }

  // 1. Query Classification and Intent Detection
  async classifyQuery(query) {
    const classificationPrompt = `
    Classify the following user query into one or more categories and extract intent:
    
    Query: "${query}"
    
    Categories:
    - CODE_IMPLEMENTATION: Questions about how to implement features or fix code
    - API_USAGE: Questions about API endpoints, parameters, responses
    - ARCHITECTURE: Questions about system design, structure, patterns
    - DEBUGGING: Questions about troubleshooting, errors, issues
    - DOCUMENTATION: Questions about how things work, explanations
    - CONFIGURATION: Questions about setup, environment, deployment
    
    Return JSON format:
    {
      "primary_category": "string",
      "secondary_categories": ["string"],
      "intent": "string",
      "technical_level": "beginner|intermediate|advanced",
      "requires_code_examples": boolean,
      "keywords": ["relevant", "technical", "terms"]
    }
    `;

    try {
      const result = await this.llm.invoke([{ role: "user", content: classificationPrompt }]);
      return JSON.parse(result.content);
    } catch (error) {
      console.warn('Query classification failed, using fallback:', error.message);
      return {
        primary_category: "DOCUMENTATION",
        secondary_categories: [],
        intent: "general_information",
        technical_level: "intermediate",
        requires_code_examples: true,
        keywords: query.split(' ').filter(word => word.length > 3)
      };
    }
  }

  // 2. Query Expansion and Reformulation
  async expandQuery(originalQuery, classification) {
    const expansionPrompt = `
    Given the original query and its classification, generate alternative phrasings and related terms that would help find relevant documentation and code.
    
    Original Query: "${originalQuery}"
    Category: ${classification.primary_category}
    Keywords: ${classification.keywords.join(', ')}
    
    Generate:
    1. 2-3 alternative phrasings of the same question
    2. Technical synonyms for key terms
    3. Related concepts that might be relevant
    
    Return JSON:
    {
      "expanded_queries": ["string"],
      "technical_synonyms": {"original_term": "synonym"},
      "related_concepts": ["string"]
    }
    `;

    try {
      const result = await this.llm.invoke([{ role: "user", content: expansionPrompt }]);
      const expansion = JSON.parse(result.content);
      
      // Create multiple search queries
      const searchQueries = [
        originalQuery,
        ...expansion.expanded_queries,
        ...expansion.related_concepts
      ];

      return {
        originalQuery,
        searchQueries: searchQueries.slice(0, 5), // Limit to 5 queries
        technicalSynonyms: expansion.technical_synonyms,
        relatedConcepts: expansion.related_concepts
      };
    } catch (error) {
      console.warn('Query expansion failed, using original:', error.message);
      return {
        originalQuery,
        searchQueries: [originalQuery],
        technicalSynonyms: {},
        relatedConcepts: []
      };
    }
  }

  // 3. Semantic Query Enhancement
  async enhanceQuery(query, context = {}) {
    // Add context from conversation history or user profile
    let enhancedQuery = query;
    
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentContext = context.conversationHistory
        .slice(-3) // Last 3 exchanges
        .map(exchange => `Previous: ${exchange.prompt} -> ${exchange.response.substring(0, 200)}`)
        .join('\n');
      
      enhancedQuery = `${query}\n\nRecent conversation context:\n${recentContext}`;
    }

    if (context.userPreferences) {
      enhancedQuery += `\n\nUser preferences: ${JSON.stringify(context.userPreferences)}`;
    }

    return enhancedQuery;
  }

  // 4. Main processing method
  async processQuery(query, context = {}) {
    console.log(`🔍 QUERY PROCESSING: Starting advanced query processing for: "${query}"`);
    
    // Step 1: Classify the query
    const classification = await this.classifyQuery(query);
    console.log(`🏷️ QUERY CLASSIFICATION:`, classification);

    // Step 2: Expand the query
    const expansion = await this.expandQuery(query, classification);
    console.log(`📈 QUERY EXPANSION: Generated ${expansion.searchQueries.length} search variants`);

    // Step 3: Enhance with context
    const enhancedQuery = await this.enhanceQuery(query, context);

    return {
      originalQuery: query,
      classification,
      expansion,
      enhancedQuery,
      searchQueries: expansion.searchQueries,
      metadata: {
        processedAt: new Date().toISOString(),
        technicalLevel: classification.technical_level,
        requiresCodeExamples: classification.requires_code_examples
      }
    };
  }
}

module.exports = QueryProcessor;
