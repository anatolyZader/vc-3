const VectorSearchOrchestrator = require('./vectorSearchOrchestrator');
const ContextBuilder = require('./contextBuilder');
const ResponseGenerator = require('./responseGenerator');

// Optional LangSmith tracing
let traceable;
try {
  ({ traceable } = require('langsmith/traceable'));
} catch (_) {
  // silent if not installed
}

// Import trace archiver for automatic analysis archiving
const TraceArchiver = require('../../langsmith/trace-archiver');

/**
 * Consolidated QueryPipeline that handles all RAG query processing
 * Combines functionality from both QueryPipeline and RagResponseGenerator
 */
class QueryPipeline {
  constructor(options = {}) {
    this.vectorStore = options.vectorStore;
    this.pinecone = options.pinecone;
    this.embeddings = options.embeddings;
    this.llm = options.llm;
    this.requestQueue = options.requestQueue;
    this.userId = options.userId;
    this.eventBus = options.eventBus;
    
    // Initialize managers
    this.vectorSearchOrchestrator = new VectorSearchOrchestrator(
      this.vectorStore, 
      this.pinecone, 
      this.embeddings
    );
    this.responseGenerator = new ResponseGenerator(this.llm, this.requestQueue);
    
    // Initialize trace archiver for automatic analysis archiving
    this.traceArchiver = new TraceArchiver();
    
    console.log(`[${new Date().toISOString()}] QueryPipeline initialized for comprehensive RAG processing`);

    this.enableTracing = process.env.LANGSMITH_TRACING === 'true' && !!traceable;
    if (this.enableTracing) {
      try {
        // Wrap core methods (bind first to preserve context)
        this.performVectorSearch = traceable(
          this.performVectorSearch.bind(this),
          {
            name: 'QueryPipeline.performVectorSearch',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { component: 'QueryPipeline', phase: 'retrieval' },
            tags: ['rag', 'retrieval']
          }
        );
        this.respondToPrompt = traceable(
          this.respondToPrompt.bind(this),
          {
            name: 'QueryPipeline.respondToPrompt',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { component: 'QueryPipeline' },
            tags: ['rag', 'pipeline']
          }
        );
        console.log(`[${new Date().toISOString()}] [TRACE] QueryPipeline tracing enabled.`);
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to enable QueryPipeline tracing: ${err.message}`);
      }
    }
  }

  /**
   * Main method that handles the complete RAG pipeline for responding to prompts
   */
  async respondToPrompt(userId, conversationId, prompt, conversationHistory = [], vectorStore = null) {
    const traceData = {
      startTime: new Date().toISOString(),
      userId,
      conversationId,
      prompt,
      traceId: null,
      runId: null,
      steps: []
    };
    
    try {
      console.log(`[${new Date().toISOString()}] QueryPipeline processing prompt for user ${userId}`);
      traceData.steps.push({ step: 'initialization', timestamp: new Date().toISOString(), status: 'success' });
      
      const activeVectorStore = vectorStore || this.vectorStore;
      
      if (!this.isVectorStoreAvailable(activeVectorStore)) {
        traceData.steps.push({ step: 'vector_store_check', timestamp: new Date().toISOString(), status: 'failed', message: 'Vector database not available' });
        console.log(`[${new Date().toISOString()}] 🔄 Vector database not available, generating standard response`);
        return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
      }
      traceData.steps.push({ step: 'vector_store_check', timestamp: new Date().toISOString(), status: 'success' });

      const searchResults = await this.performVectorSearch(prompt, activeVectorStore, traceData);
      
      if (searchResults.length === 0) {
        traceData.steps.push({ step: 'vector_search', timestamp: new Date().toISOString(), status: 'no_results' });
        console.log(`[${new Date().toISOString()}] 🔄 No relevant documents found, generating standard response`);
        return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
      }
      traceData.steps.push({ step: 'vector_search', timestamp: new Date().toISOString(), status: 'success', documentsFound: searchResults.length });

      const contextData = ContextBuilder.formatContext(searchResults);
      traceData.steps.push({ step: 'context_building', timestamp: new Date().toISOString(), status: 'success', contextSize: contextData.context.length });
      
      const response = await this.responseGenerator.generateWithContext(prompt, contextData, conversationHistory);
      traceData.steps.push({ step: 'response_generation', timestamp: new Date().toISOString(), status: 'success', responseLength: response?.content?.length || 0 });
      
      // Capture the AI response for trace analysis with LangSmith data
      if (process.env.RAG_ENABLE_CHUNK_LOGGING === 'true') {
        try {
          traceData.endTime = new Date().toISOString();
          traceData.totalDuration = new Date(traceData.endTime) - new Date(traceData.startTime);
          
          // Attempt to capture LangSmith trace metadata
          try {
            const { getCurrentRunTree } = require('langsmith');
            const currentRun = getCurrentRunTree();
            if (currentRun) {
              traceData.traceId = currentRun.trace_id;
              traceData.runId = currentRun.id;
              console.log(`[${new Date().toISOString()}] 🔗 LANGSMITH: Captured trace ID: ${traceData.traceId}`);
            }
          } catch (langsmithError) {
            console.log(`[${new Date().toISOString()}] 📝 LANGSMITH: Trace capture not available: ${langsmithError.message}`);
          }
          
          // Update trace analysis with comprehensive LangSmith trace data
          setImmediate(async () => {
            try {
              const analysisContent = this.generateComprehensiveTraceAnalysis(prompt, searchResults, traceData, response);
              await this.traceArchiver.updateTraceAnalysis(analysisContent);
              console.log(`[${new Date().toISOString()}] 📊 TRACE-ARCHIVER: Updated trace analysis with LangSmith trace data`);
              console.log(`[${new Date().toISOString()}] 🔍 Trace details: ${traceData.chunks?.length || 0} chunks, ${traceData.totalDuration}ms total`);
            } catch (error) {
              console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to update analysis with trace data: ${error.message}`);
            }
          });
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to capture trace data: ${error.message}`);
        }
      }
      
      this.emitRagStatus('retrieval_success', this.createSuccessMetrics(searchResults, userId, conversationId));
      
      return this.createSuccessResponse(response, conversationId, contextData, conversationHistory);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in QueryPipeline.respondToPrompt:`, error.message);
      return this.createErrorResponse(error, conversationId);
    }
  }

  /**
   * Generates a standard response without RAG context
   */
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    try {
      const result = await this.responseGenerator.generateStandard(prompt, conversationHistory);
      
      console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Generated standard response with conversation history for conversation ${conversationId}`);
      
      return {
        success: true,
        response: result.content,
        conversationId,
        timestamp: new Date().toISOString(),
        sourcesUsed: 0,
        ragEnabled: false,
        conversationHistoryUsed: conversationHistory.length > 0,
        historyMessages: conversationHistory.length
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in generateStandardResponse:`, error.message);
      
      if (this.responseGenerator.isRateLimitError(error)) {
        return this.createRateLimitResponse(conversationId, error);
      }

      return this.createErrorResponse(error, conversationId);
    }
  }

  // Helper methods
  isVectorStoreAvailable(vectorStore) {
    return vectorStore && this.pinecone;
  }

  async performVectorSearch(prompt, vectorStore, traceData = null) {
    if (vectorStore !== this.vectorStore) {
      // Create temporary search orchestrator for different vector store
      const tempSearchOrchestrator = new VectorSearchOrchestrator(vectorStore, this.pinecone, this.embeddings);
      const results = await tempSearchOrchestrator.performSearch(prompt);
      
      if (traceData) {
        traceData.vectorStore = 'temporary';
        traceData.searchStrategy = 'temp_orchestrator';
        traceData.chunks = this.captureChunkData(results);
      }
      
      // Log full chunk content if enabled
      if (process.env.RAG_ENABLE_CHUNK_LOGGING === 'true' && results.length > 0) {
        console.log(`[${new Date().toISOString()}] 📋 CHUNK CONTENT LOGGING (temp): Retrieved ${results.length} chunks for query: "${prompt.substring(0, 100)}..."`);
        
        // Archive previous analysis and create new one (only once per query)
        if (!this._archiveCreated) {
          try {
            await this.traceArchiver.archiveAndPrepare(prompt, new Date().toISOString());
            console.log(`[${new Date().toISOString()}] 📁 TRACE-ARCHIVER: Archived previous analysis and created new trace file`);
            this._archiveCreated = true;
          } catch (error) {
            console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to archive: ${error.message}`);
          }
        }
        
        this.logChunkDetails(results);
      }
      
      // Emit retrieval success status
      if (results.length > 0) {
        this.emitRagStatus('retrieval_success', {
          userId: this.userId,
          conversationId: '',
          documentsFound: results.length,
          sources: results.map(doc => doc.metadata.source || 'Unknown'),
          sourceTypes: {
            apiSpec: results.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
            githubCode: results.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
          },
          firstDocContentPreview: results[0].pageContent.substring(0, 100) + '...'
        });
      }
      
      return results;
    }
    
    if (traceData) {
      traceData.vectorStore = 'primary';
      traceData.searchStrategy = 'vector_search_orchestrator';
    }
    
    const results = await this.vectorSearchOrchestrator.performSearch(prompt);
    
    if (traceData) {
      traceData.chunks = this.captureChunkData(results);
    }
    
    // Log full chunk content if enabled
    if (process.env.RAG_ENABLE_CHUNK_LOGGING === 'true' && results.length > 0) {
      console.log(`[${new Date().toISOString()}] 📋 CHUNK CONTENT LOGGING: Retrieved ${results.length} chunks for query: "${prompt.substring(0, 100)}..."`);
      
      // Archive previous analysis and create new one (only once per query)
      if (!this._archiveCreated) {
        try {
          await this.traceArchiver.archiveAndPrepare(prompt, new Date().toISOString());
          console.log(`[${new Date().toISOString()}] 📁 TRACE-ARCHIVER: Archived previous analysis and created new trace file`);
          this._archiveCreated = true;
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to archive: ${error.message}`);
        }
      }
      
      this.logChunkDetails(results);
    }
    
    // Emit retrieval success status
    if (results.length > 0) {
      this.emitRagStatus('retrieval_success', {
        userId: this.userId,
        conversationId: '',
        documentsFound: results.length,
        sources: results.map(doc => doc.metadata.source || 'Unknown'),
        sourceTypes: {
          apiSpec: results.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
          githubCode: results.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
        },
        firstDocContentPreview: results[0].pageContent.substring(0, 100) + '...'
      });
    }
    
    return results;
  }

  createStandardResponseIndicator(reason) {
    console.warn(`[${new Date().toISOString()}] ${reason}, indicating standard response should be used`);
    return {
      success: true,
      useStandardResponse: true,
      reason
    };
  }

  createSuccessResponse(response, conversationId, contextData, conversationHistory) {
    return {
      success: true,
      response: response.content,
      conversationId,
      timestamp: new Date().toISOString(),
      ragEnabled: true,
      contextSize: contextData.context.length,
      sourcesUsed: contextData.sourceAnalysis,
      sourcesBreakdown: contextData.sourcesBreakdown,
      conversationHistoryUsed: conversationHistory.length > 0,
      historyMessages: conversationHistory.length
    };
  }

  createErrorResponse(error, conversationId) {
    return {
      success: false,
      response: "I encountered an issue while processing your request. Please try again shortly.",
      conversationId,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }

  createRateLimitResponse(conversationId, error) {
    return {
      success: false,
      response: "I'm currently experiencing high demand. Please try again in a few moments.",
      conversationId,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }

  createSuccessMetrics(searchResults, userId, conversationId) {
    return {
      userId,
      conversationId,
      documentsFound: searchResults.length,
      sources: searchResults.map(doc => doc.metadata.source || 'Unknown'),
      sourceTypes: {
        apiSpec: searchResults.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
        githubCode: searchResults.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
      },
      firstDocContentPreview: searchResults[0]?.pageContent.substring(0, 100) + '...'
    };
  }

  emitRagStatus(status, data) {
    if (this.eventBus?.emit) {
      this.eventBus.emit('ragStatus', { status, ...data });
      console.log(`[${new Date().toISOString()}] Emitted RAG status: ${status}`);
    }
  }

  /**
   * Generate comprehensive trace analysis content from query and results
   */
  generateTraceAnalysis(prompt, searchResults, timestamp, aiResponse = null) {
    const totalChars = searchResults.reduce((sum, doc) => sum + doc.pageContent.length, 0);
    const sources = searchResults.map(doc => doc.metadata.source || 'Unknown');
    const uniqueSources = [...new Set(sources)];
    
    // Categorize source types
    const sourceTypes = {
      githubCode: searchResults.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length,
      moduleDocs: searchResults.filter(doc => doc.metadata.type === 'module_documentation').length,
      architectureDocs: searchResults.filter(doc => doc.metadata.type === 'architecture_documentation').length,
      apiSpec: searchResults.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
      other: searchResults.filter(doc => 
        !doc.metadata.repoId && 
        !doc.metadata.githubOwner && 
        !['module_documentation', 'architecture_documentation', 'apiSpec', 'apiSpecFull'].includes(doc.metadata.type)
      ).length
    };

    const content = `# RAG Trace Analysis - ${new Date(timestamp).toLocaleString()}

## Query Details
- **Query**: "${prompt}"
- **Timestamp**: ${timestamp}
- **User ID**: ${this.userId || 'Unknown'}
- **Analysis Generated**: ${new Date().toISOString()}

## RAG Pipeline Execution Flow

### 1. Initialization Phase ✅
- LangSmith tracing: ${process.env.LANGSMITH_TRACING === 'true' ? 'Enabled' : 'Disabled'}
- Vector store available: ${this.vectorStore ? 'Yes' : 'No'}
- QueryPipeline initialized successfully

### 2. Vector Search Results 🎯

**Total Retrieved**: ${searchResults.length} documents from vector store
**Total Context**: ${totalChars.toLocaleString()} characters

#### Document Sources Breakdown:
${searchResults.map((doc, index) => 
  `${index + 1}. **${doc.metadata.source || 'Unknown'}** (${doc.pageContent.length} chars) - ${doc.metadata.type || 'Unknown type'}`
).join('\n')}

#### Source Type Distribution:
- **GitHub Repository Code**: ${sourceTypes.githubCode} chunks (${Math.round(sourceTypes.githubCode/searchResults.length*100)}%)
- **Module Documentation**: ${sourceTypes.moduleDocs} chunks (${Math.round(sourceTypes.moduleDocs/searchResults.length*100)}%)  
- **Architecture Documentation**: ${sourceTypes.architectureDocs} chunks (${Math.round(sourceTypes.architectureDocs/searchResults.length*100)}%)
- **API Specification**: ${sourceTypes.apiSpec} chunks (${Math.round(sourceTypes.apiSpec/searchResults.length*100)}%)
- **Other Sources**: ${sourceTypes.other} chunks (${Math.round(sourceTypes.other/searchResults.length*100)}%)

## Retrieved Chunk Details 🔍

${searchResults.map((doc, index) => `
### Chunk ${index + 1}/${searchResults.length}
- **Source**: ${doc.metadata.source || 'Unknown'}
- **Type**: ${doc.metadata.type || 'Unknown'}
- **Size**: ${doc.pageContent.length} characters
- **Repository**: ${doc.metadata.repoUrl || doc.metadata.repository || 'N/A'}
- **Branch**: ${doc.metadata.branch || 'N/A'}

**Content Preview**:
\`\`\`
${doc.pageContent.substring(0, 200)}${doc.pageContent.length > 200 ? '...' : ''}
\`\`\`

**Full Content**:
\`\`\`
${doc.pageContent}
\`\`\`

---
`).join('')}

${aiResponse ? `## AI Response Analysis 🤖

### Generated Response:
**Status**: ${aiResponse ? '✅ Generated Successfully' : '❌ Not Available'}
**Response Length**: ${aiResponse?.content ? aiResponse.content.length : 0} characters
**Generated At**: ${new Date().toISOString()}

### Response Content:
\`\`\`markdown
${aiResponse?.content || 'Response not captured'}
\`\`\`

### Response Quality Assessment:
- **Relevance to Query**: ${this.assessResponseRelevance(prompt, aiResponse)}
- **Use of Context**: ${this.assessContextUsage(searchResults, aiResponse)}
- **Response Completeness**: ${this.assessResponseCompleteness(aiResponse)}

### Key Response Elements:
${this.extractResponseElements(aiResponse)}

---
` : ''}

## Performance Metrics 📈

### Search Efficiency:
- **Documents Retrieved**: ${searchResults.length}
- **Unique Sources**: ${uniqueSources.length}
- **Average Chunk Size**: ${Math.round(totalChars / searchResults.length)} characters
- **Query Processing**: Successful

### Context Quality:
- **Relevance Score**: ${searchResults.length > 0 ? 'HIGH' : 'LOW'} (${searchResults.length} relevant chunks found)
- **Diversity Score**: ${uniqueSources.length > 3 ? 'EXCELLENT' : uniqueSources.length > 1 ? 'GOOD' : 'LOW'} (${uniqueSources.length} unique sources)
- **Completeness Score**: ${totalChars > 3000 ? 'HIGH' : totalChars > 1000 ? 'MEDIUM' : 'LOW'} (${totalChars.toLocaleString()} total characters)

## Source Analysis 📊

### Most Frequent Sources:
${Object.entries(sources.reduce((acc, source) => {
  acc[source] = (acc[source] || 0) + 1;
  return acc;
}, {}))
.sort(([,a], [,b]) => b - a)
.slice(0, 5)
.map(([source, count]) => `- **${source}**: ${count} chunks`)
.join('\n')}

### Repository Coverage:
${[...new Set(searchResults
  .filter(doc => doc.metadata.repoUrl || doc.metadata.repository)
  .map(doc => doc.metadata.repoUrl || doc.metadata.repository))]
  .map(repo => `- ${repo}`)
  .join('\n') || '- No repository sources detected'}

## Query Classification 🏷️

- **Query Type**: ${this.classifyQueryType(prompt)}
- **Domain Focus**: ${this.extractDomainFocus(searchResults)}
- **Technical Complexity**: ${prompt.length > 50 ? 'High' : prompt.length > 20 ? 'Medium' : 'Low'}

## Recommendations 🚀

${this.generateRecommendations(searchResults, prompt)}

## Conclusion ✨

This trace demonstrates ${this.evaluateOverallPerformance(searchResults, totalChars)} RAG performance with:
- **Retrieval Quality**: ${searchResults.length > 5 ? 'Excellent' : searchResults.length > 2 ? 'Good' : 'Needs Improvement'}
- **Context Diversity**: ${uniqueSources.length > 3 ? 'High' : 'Medium'}
- **Content Richness**: ${totalChars > 5000 ? 'Very High' : totalChars > 2000 ? 'High' : 'Medium'}

The query was ${searchResults.length > 0 ? 'successfully processed' : 'not well matched'} with ${searchResults.length > 0 ? 'relevant' : 'limited'} context retrieved from the knowledge base.

---
**Analysis Generated**: ${new Date().toISOString()}  
**LangSmith Project**: ${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'}  
**Environment**: ${process.env.NODE_ENV || 'development'}
**Auto-Generated**: true
`;

    return content;
  }

  /**
   * Helper methods for trace analysis
   */
  classifyQueryType(prompt) {
    if (prompt.toLowerCase().includes('how') || prompt.toLowerCase().includes('what')) {
      return 'Informational/Explanatory';
    } else if (prompt.toLowerCase().includes('error') || prompt.toLowerCase().includes('issue')) {
      return 'Troubleshooting/Debug';
    } else if (prompt.toLowerCase().includes('implement') || prompt.toLowerCase().includes('create')) {
      return 'Implementation/Development';
    } else {
      return 'General/Conversational';
    }
  }

  extractDomainFocus(searchResults) {
    const sources = searchResults.map(doc => doc.metadata.source || '').join(' ').toLowerCase();
    
    if (sources.includes('business_modules')) return 'Business Logic';
    if (sources.includes('aop_modules')) return 'Cross-cutting Concerns';
    if (sources.includes('infrastructure')) return 'Infrastructure';
    if (sources.includes('api')) return 'API/Interface';
    if (sources.includes('architecture')) return 'System Architecture';
    
    return 'General Application';
  }

  generateRecommendations(searchResults, prompt) {
    const recommendations = [];
    
    if (searchResults.length === 0) {
      recommendations.push('- Consider expanding the query with more specific terms');
      recommendations.push('- Check if the relevant documentation is indexed');
    } else {
      if (searchResults.length < 3) {
        recommendations.push('- Query could benefit from more context documents');
      }
      
      const sourceTypes = new Set(searchResults.map(doc => doc.metadata.type));
      if (sourceTypes.size === 1) {
        recommendations.push('- Consider indexing more diverse document types');
      }
      
      if (searchResults.every(doc => !doc.metadata.repoId)) {
        recommendations.push('- Add more code repository context');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- RAG performance is optimal for this query type');
      recommendations.push('- Continue monitoring for consistency');
    }
    
    return recommendations.join('\n');
  }

  evaluateOverallPerformance(searchResults, totalChars) {
    if (searchResults.length >= 5 && totalChars > 3000) return 'excellent';
    if (searchResults.length >= 3 && totalChars > 1500) return 'good';
    if (searchResults.length >= 1 && totalChars > 500) return 'adequate';
    return 'needs improvement';
  }

  /**
   * Helper methods for AI response analysis
   */
  assessResponseRelevance(prompt, aiResponse) {
    if (!aiResponse?.content) return 'N/A - No response captured';
    
    const response = aiResponse.content.toLowerCase();
    const query = prompt.toLowerCase();
    
    // Check if response addresses key terms from query
    const queryWords = query.split(/\s+/).filter(word => word.length > 3);
    const relevantWords = queryWords.filter(word => response.includes(word));
    
    const relevanceRatio = relevantWords.length / Math.max(queryWords.length, 1);
    
    if (relevanceRatio > 0.7) return 'HIGH - Directly addresses query terms';
    if (relevanceRatio > 0.4) return 'MEDIUM - Partially addresses query';
    return 'LOW - Limited relevance to query terms';
  }

  assessContextUsage(searchResults, aiResponse) {
    if (!aiResponse?.content) return 'N/A - No response captured';
    
    const response = aiResponse.content.toLowerCase();
    
    // Check if response references source files or concepts from chunks
    const sourceFiles = searchResults.map(doc => 
      (doc.metadata.source || '').split('/').pop()?.replace(/\.(js|md|json)$/, '')
    ).filter(Boolean);
    
    const referencedSources = sourceFiles.filter(source => 
      source && response.includes(source.toLowerCase())
    );
    
    const usageRatio = referencedSources.length / Math.max(sourceFiles.length, 1);
    
    if (usageRatio > 0.5) return 'EXCELLENT - Explicitly references source files';
    if (usageRatio > 0.2) return 'GOOD - Some reference to retrieved context';
    if (response.includes('based on') || response.includes('according to')) return 'MEDIUM - Implicit context usage';
    return 'LOW - Limited use of retrieved context';
  }

  assessResponseCompleteness(aiResponse) {
    if (!aiResponse?.content) return 'N/A - No response captured';
    
    const content = aiResponse.content;
    const length = content.length;
    
    // Check for structured response elements
    const hasStructure = content.includes('1.') || content.includes('•') || content.includes('-');
    const hasExplanation = length > 200;
    const hasConclusion = content.toLowerCase().includes('summary') || 
                         content.toLowerCase().includes('conclusion') ||
                         content.toLowerCase().includes('in summary');
    
    if (hasStructure && hasExplanation && hasConclusion) return 'EXCELLENT - Well-structured and comprehensive';
    if (hasStructure && hasExplanation) return 'GOOD - Structured with adequate detail';
    if (hasExplanation) return 'MEDIUM - Adequate detail but could be better structured';
    if (length > 50) return 'BASIC - Brief but relevant';
    return 'POOR - Very short or incomplete';
  }

  extractResponseElements(aiResponse) {
    if (!aiResponse?.content) return '- No response elements to analyze';
    
    const content = aiResponse.content;
    const elements = [];
    
    // Check for code blocks
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    if (codeBlocks > 0) elements.push(`- **Code Examples**: ${codeBlocks} code blocks included`);
    
    // Check for numbered lists
    const numberedLists = (content.match(/\d+\./g) || []).length;
    if (numberedLists > 0) elements.push(`- **Structured Lists**: ${numberedLists} numbered points`);
    
    // Check for bullet points
    const bulletPoints = (content.match(/^[\s]*[-•*]/gm) || []).length;
    if (bulletPoints > 0) elements.push(`- **Bullet Points**: ${bulletPoints} bullet items`);
    
    // Check for file references
    const fileRefs = (content.match(/\w+\.(js|md|json|ts|py)/g) || []).length;
    if (fileRefs > 0) elements.push(`- **File References**: ${fileRefs} specific files mentioned`);
    
    // Check for technical terms
    const techTerms = (content.match(/\b(function|class|module|component|API|method|property)\b/gi) || []).length;
    if (techTerms > 0) elements.push(`- **Technical Terms**: ${techTerms} technical concepts used`);
    
    return elements.length > 0 ? elements.join('\n') : '- No specific structural elements detected';
  }

  /**
   * Helper methods for trace data capture
   */
  captureChunkData(results) {
    return results.map((doc, index) => ({
      index: index + 1,
      source: doc.metadata.source || 'Unknown',
      type: doc.metadata.type || 'Unknown',
      score: doc.metadata.score || 'N/A',
      size: doc.pageContent.length,
      content: doc.pageContent,
      metadata: doc.metadata
    }));
  }

  logChunkDetails(results) {
    results.forEach((doc, index) => {
      console.log(`[${new Date().toISOString()}] 📄 CHUNK ${index + 1}/${results.length}:`);
      console.log(`[${new Date().toISOString()}] 🏷️  Source: ${doc.metadata.source || 'Unknown'}`);
      console.log(`[${new Date().toISOString()}] 🏷️  Type: ${doc.metadata.type || 'Unknown'}`);
      console.log(`[${new Date().toISOString()}] 🏷️  Score: ${doc.metadata.score || 'N/A'}`);
      console.log(`[${new Date().toISOString()}] 📝 Content: ${doc.pageContent}`);
      console.log(`[${new Date().toISOString()}] ──────────────────────────────────────────────────────────────────────────────────`);
    });
  }

  /**
   * Generate comprehensive trace analysis including LangSmith trace data
   */
  generateComprehensiveTraceAnalysis(prompt, searchResults, traceData, aiResponse = null) {
    const totalChars = searchResults.reduce((sum, doc) => sum + doc.pageContent.length, 0);
    const sources = searchResults.map(doc => doc.metadata.source || 'Unknown');
    const uniqueSources = [...new Set(sources)];
    
    // Categorize source types
    const sourceTypes = {
      githubCode: searchResults.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length,
      moduleDocs: searchResults.filter(doc => doc.metadata.type === 'module_documentation').length,
      architectureDocs: searchResults.filter(doc => doc.metadata.type === 'architecture_documentation').length,
      apiSpec: searchResults.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
      other: searchResults.filter(doc => 
        !doc.metadata.repoId && 
        !doc.metadata.githubOwner && 
        !['module_documentation', 'architecture_documentation', 'apiSpec', 'apiSpecFull'].includes(doc.metadata.type)
      ).length
    };

    const content = `# LangSmith RAG Trace Analysis - ${new Date(traceData.startTime).toLocaleString()}

## 🔍 Query Details
- **Query**: "${prompt}"
- **User ID**: ${traceData.userId || 'Unknown'}
- **Conversation ID**: ${traceData.conversationId || 'Unknown'}
- **Started**: ${traceData.startTime}
- **Completed**: ${traceData.endTime || 'In Progress'}
- **Total Duration**: ${traceData.totalDuration ? `${traceData.totalDuration}ms` : 'Calculating...'}

## 🔗 LangSmith Trace Information
- **Project**: ${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'}
- **Tracing Enabled**: ${process.env.LANGSMITH_TRACING === 'true' ? 'Yes' : 'No'}
- **Trace ID**: ${traceData.traceId || 'Not captured'}
- **Run ID**: ${traceData.runId || 'Not captured'}
- **Environment**: ${process.env.NODE_ENV || 'development'}

### Pipeline Execution Steps:
${traceData.steps.map((step, index) => 
  `${index + 1}. **${step.step}** (${step.timestamp}) - ${step.status}${step.message ? `: ${step.message}` : ''}${step.documentsFound ? ` - Found ${step.documentsFound} documents` : ''}${step.contextSize ? ` - Context: ${step.contextSize} chars` : ''}${step.responseLength ? ` - Response: ${step.responseLength} chars` : ''}`
).join('\n')}

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: ${traceData.vectorStore || 'Unknown'}
- **Search Strategy**: ${traceData.searchStrategy || 'Unknown'}
- **Documents Retrieved**: ${searchResults.length}
- **Total Context**: ${totalChars.toLocaleString()} characters

### Source Type Distribution:
- **GitHub Repository Code**: ${sourceTypes.githubCode} chunks (${Math.round(sourceTypes.githubCode/searchResults.length*100)}%)
- **Module Documentation**: ${sourceTypes.moduleDocs} chunks (${Math.round(sourceTypes.moduleDocs/searchResults.length*100)}%)  
- **Architecture Documentation**: ${sourceTypes.architectureDocs} chunks (${Math.round(sourceTypes.architectureDocs/searchResults.length*100)}%)
- **API Specification**: ${sourceTypes.apiSpec} chunks (${Math.round(sourceTypes.apiSpec/searchResults.length*100)}%)
- **Other Sources**: ${sourceTypes.other} chunks (${Math.round(sourceTypes.other/searchResults.length*100)}%)

## 📋 Complete Chunk Analysis

${traceData.chunks ? traceData.chunks.map(chunk => `
### Chunk ${chunk.index}/${traceData.chunks.length}
- **Source**: ${chunk.source}
- **Type**: ${chunk.type}
- **Size**: ${chunk.size} characters
- **Score**: ${chunk.score}
- **Repository**: ${chunk.metadata.repoUrl || chunk.metadata.repository || 'N/A'}
- **Branch**: ${chunk.metadata.branch || 'N/A'}
- **File Type**: ${chunk.metadata.fileType || 'N/A'}
- **Processed At**: ${chunk.metadata.processedAt || 'N/A'}

**Full Content**:
\`\`\`
${chunk.content}
\`\`\`

**Metadata**:
\`\`\`json
${JSON.stringify(chunk.metadata, null, 2)}
\`\`\`

---
`).join('') : 'Chunk data not captured'}

${aiResponse ? `## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: ${aiResponse.content ? aiResponse.content.length : 0} characters
**Generated At**: ${new Date().toISOString()}

### Response Content:
\`\`\`markdown
${aiResponse.content || 'Response not captured'}
\`\`\`

### Response Quality Assessment:
- **Relevance to Query**: ${this.assessResponseRelevance(prompt, aiResponse)}
- **Use of Context**: ${this.assessContextUsage(searchResults, aiResponse)}
- **Response Completeness**: ${this.assessResponseCompleteness(aiResponse)}

### Key Response Elements:
${this.extractResponseElements(aiResponse)}

---
` : ''}

## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: ${traceData.totalDuration ? `${traceData.totalDuration}ms` : 'In Progress'}
- **Documents Retrieved**: ${searchResults.length}
- **Unique Sources**: ${uniqueSources.length}
- **Average Chunk Size**: ${Math.round(totalChars / searchResults.length)} characters

### Context Quality:
- **Relevance Score**: ${searchResults.length > 0 ? 'HIGH' : 'LOW'} (${searchResults.length} relevant chunks found)
- **Diversity Score**: ${uniqueSources.length > 3 ? 'EXCELLENT' : uniqueSources.length > 1 ? 'GOOD' : 'LOW'} (${uniqueSources.length} unique sources)
- **Completeness Score**: ${totalChars > 3000 ? 'HIGH' : totalChars > 1000 ? 'MEDIUM' : 'LOW'} (${totalChars.toLocaleString()} total characters)

### LangSmith Integration:
- **Tracing Status**: ${process.env.LANGSMITH_TRACING === 'true' ? '✅ Active' : '❌ Disabled'}
- **Project Configuration**: ${process.env.LANGCHAIN_PROJECT ? '✅ Configured' : '❌ Missing'}
- **API Key Status**: ${process.env.LANGSMITH_API_KEY ? '✅ Present' : '❌ Missing'}

## 🔍 Source Analysis

### Most Frequent Sources:
${Object.entries(sources.reduce((acc, source) => {
  acc[source] = (acc[source] || 0) + 1;
  return acc;
}, {}))
.sort(([,a], [,b]) => b - a)
.slice(0, 5)
.map(([source, count]) => `- **${source}**: ${count} chunks`)
.join('\n')}

### Repository Coverage:
${[...new Set(searchResults
  .filter(doc => doc.metadata.repoUrl || doc.metadata.repository)
  .map(doc => doc.metadata.repoUrl || doc.metadata.repository))]
  .map(repo => `- ${repo}`)
  .join('\n') || '- No repository sources detected'}

## 🎯 Query Classification & Analysis

- **Query Type**: ${this.classifyQueryType(prompt)}
- **Domain Focus**: ${this.extractDomainFocus(searchResults)}
- **Technical Complexity**: ${prompt.length > 50 ? 'High' : prompt.length > 20 ? 'Medium' : 'Low'}
- **Expected Response Type**: ${this.predictResponseType(prompt)}

## 🚀 Recommendations

${this.generateComprehensiveRecommendations(searchResults, prompt, traceData, aiResponse)}

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates ${this.evaluateOverallPerformance(searchResults, totalChars)} RAG performance with:
- **Retrieval Quality**: ${searchResults.length > 5 ? 'Excellent' : searchResults.length > 2 ? 'Good' : 'Needs Improvement'}
- **Context Diversity**: ${uniqueSources.length > 3 ? 'High' : 'Medium'}
- **Content Richness**: ${totalChars > 5000 ? 'Very High' : totalChars > 2000 ? 'High' : 'Medium'}
- **Response Quality**: ${aiResponse ? (aiResponse.content?.length > 500 ? 'Comprehensive' : 'Adequate') : 'Not Captured'}

The query was ${searchResults.length > 0 ? 'successfully processed' : 'not well matched'} with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: ${new Date().toISOString()}  
**LangSmith Project**: ${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'}  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
`;

    return content;
  }

  predictResponseType(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('how') || p.includes('explain')) return 'Explanatory';
    if (p.includes('what') || p.includes('define')) return 'Informational';
    if (p.includes('compare') || p.includes('difference')) return 'Comparative';
    if (p.includes('example') || p.includes('show')) return 'Demonstrative';
    return 'General';
  }

  generateComprehensiveRecommendations(searchResults, prompt, traceData, aiResponse) {
    const recommendations = [];
    
    // LangSmith specific recommendations
    if (process.env.LANGSMITH_TRACING !== 'true') {
      recommendations.push('- **Enable LangSmith Tracing**: Set LANGSMITH_TRACING=true for better observability');
    }
    
    if (!process.env.LANGSMITH_API_KEY) {
      recommendations.push('- **Configure LangSmith API**: Add LANGSMITH_API_KEY for full trace capture');
    }
    
    // Performance recommendations
    if (traceData.totalDuration > 5000) {
      recommendations.push('- **Optimize Query Performance**: Query took over 5 seconds, consider caching or index optimization');
    }
    
    // Content recommendations
    if (searchResults.length === 0) {
      recommendations.push('- **Expand Vector Index**: No documents found, consider indexing more content');
    } else if (searchResults.length < 3) {
      recommendations.push('- **Improve Retrieval**: Low document count, consider adjusting similarity thresholds');
    }
    
    // Response quality recommendations
    if (aiResponse && aiResponse.content?.length < 100) {
      recommendations.push('- **Enhance Response Generation**: Response seems brief, consider adjusting prompt templates');
    }
    
    // Source diversity recommendations
    const uniqueSources = [...new Set(searchResults.map(doc => doc.metadata.source))];
    if (uniqueSources.length === 1) {
      recommendations.push('- **Increase Source Diversity**: All chunks from same source, consider broader indexing');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- **Excellent Performance**: RAG pipeline is performing optimally');
      recommendations.push('- **Continue Monitoring**: Maintain current configuration and observe trends');
    }
    
    return recommendations.join('\n');
  }
}

module.exports = QueryPipeline;
