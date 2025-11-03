---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-11-03T16:12:11.957Z
- Triggered by query: "list all methods in aiService.js"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 11/3/2025, 4:11:59 PM

## 🔍 Query Details
- **Query**: "list all methods in ai"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: db81afed-da95-47a6-879f-fc0648fa651c
- **Started**: 2025-11-03T16:11:59.651Z
- **Completed**: 2025-11-03T16:12:03.874Z
- **Total Duration**: 4223ms

## 🔗 LangSmith Trace Information
- **Project**: eventstorm-trace
- **Tracing Enabled**: ✅ Yes
- **Trace ID**: ❌ Error: getCurrentRunTree is not a function
- **Run ID**: ⚠️  Not captured

- **Environment**: development




❌ **Tracing Error**: getCurrentRunTree is not a function
   - LangSmith tracing is enabled but failed to capture trace metadata
   - Check LANGCHAIN_API_KEY and LANGCHAIN_PROJECT settings
   - Verify langsmith package is installed correctly


### Pipeline Execution Steps:
1. **initialization** (2025-11-03T16:11:59.651Z) - success
2. **vector_store_check** (2025-11-03T16:11:59.651Z) - success
3. **vector_search** (2025-11-03T16:12:00.989Z) - success - Found 5 documents
4. **text_search** (2025-11-03T16:12:01.067Z) - success
5. **hybrid_search_combination** (2025-11-03T16:12:01.067Z) - success
6. **context_building** (2025-11-03T16:12:01.069Z) - success - Context: 7303 chars
7. **response_generation** (2025-11-03T16:12:03.874Z) - success - Response: 834 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 5
- **Raw Content Size**: 51,792 characters (original chunks)
- **Formatted Context Size**: 7,303 characters (sent to LLM)
- **Compression Ratio**: 14% (due to truncation + formatting overhead)

### Source Type Distribution:
- **GitHub Repository Code**: 5 chunks (100%)
- **Module Documentation**: 0 chunks (0%)  
- **Architecture Documentation**: 0 chunks (0%)
- **API Specification**: 0 chunks (0%)
- **Other Sources**: 0 chunks (0%)

## 🏷️ Ubiquitous Language (UL) Tags Analysis

### UL Tag Coverage:
- **Chunks with UL Tags**: 0/5 (0%)
- **Chunks without UL Tags**: 5/5 (100%)
- **Coverage Status**: ❌ Poor - Repository may need re-indexing

### Domain Coverage:
- **Bounded Contexts**: 0 unique contexts
  
- **Business Modules**: 0 unique modules
  
- **Total UL Terms**: 0 terms found across all chunks
- **Unique Terms**: 0 distinct terms
  
- **Domain Events**: 0 unique events
  

### ⚠️ Missing UL Tags Warning:
5 chunks (100%) are missing ubiquitous language tags. This may indicate:
- Files indexed before UL enhancement was implemented (check `processedAt` timestamps)
- Non-code files (markdown analysis files, configs) that bypass UL processing
- Repository needs re-indexing to apply current UL enhancement pipeline
- Error during UL enhancement (check logs for warnings)

**Recommendation**: 🔴 **CRITICAL**: Re-index repository to apply UL tags to all chunks



## 📋 Complete Chunk Analysis


### Chunk 1/5
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 12115 characters
- **Score**: 0.39998439
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// aiController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {


    fastify.decorate('respondToPrompt', async (request, reply) => {
      try {
        const { conversationId, prompt } = request.body;
        const userId = request.user.id;
        
        fastify.log.info(`🤖 AI Controller: Processing prompt for user ${userId}, conversation ${conversationId}`);
           // Check if diScope is available
      if (!request.diScope) {
        fastify.log.error('❌ AI Controller: diScope is missing in request');
        // Fallback: create scope manually
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ AI Controller: Created diScope manually as fallback');
      }
        
        const aiService = await request.diScope.resolve('aiService');
        if (!aiService) {
          fastify.log.error('❌ AI Controller: Failed to resolve aiService from diScope');
          throw new Error('aiService could not be resolved');
        }
        
        // Check and set userId on adapter if needed
        if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
          await aiService.aiAdapter.setUserId(userId);
          fastify.log.debug(`🔧 AI Controller: userId set on adapter: ${userId}`);
        }
        
        // Ensure persistence adapter is available for conversation history
        if (aiService.aiAdapter && aiService.aiPersistAdapter && typeof aiService.aiAdapter.setPersistenceAdapter === 'function') {
          aiService.aiAdapter.setPersistenceAdapter(aiService.aiPersistAdapter);
          fastify.log.debug(`🔧 AI Controller: persistence adapter set on AI adapter for conversation history`);
        }
        
        const TIMEOUT_MS = 90000; // Increased from 60s to 90s
        fastify.log.debug(`🔧 AI Controller: Timeout set to ${TIMEOUT_MS}ms`);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request processing timeout')), TIMEOUT_MS);
        });

        const responsePromise = aiService.respondToPrompt(userId, conversationId, prompt);
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        return { 
          response,
          status: 'success',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        fastify.log.error(`❌ AI Controller error:`, error);
        if (error.stack) {
          fastify.log.error(`❌ AI Controller error stack: ${error.stack}`);
        }
        throw fastify.httpErrors.internalServerError('Failed to process AI request', { cause: error });
      }
    });

    fastify.decorate('processPushedRepo', async (request, reply) => {
    try {
      const { repoId, repoData} = request.body;
      const userId = request.user.id; 
      fastify.log.info(`Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      
      // Ensure diScope is available
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ Created diScope manually as fallback');
      }
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      const response = await aiService.processPushedRepo(userId, repoId, repoData);
      
      fastify.log.info(`pushed repo processed: ${repoId}`);
      return response;
    } catch (error) {
      fastify.log.error('Error processing pushed repo:', error);
      throw fastify.httpErrors.internalServerError('Failed to process pushed repo:', { cause: error });
    }
  });

  fastify.decorate('manualProcessRepoDirect', async (request, reply) => {
    try {
      const { repoId, githubOwner, repoName, branch = 'main', repoUrl } = request.body;
      const userId = request.user.id;
      
      fastify.log.info(`Manual direct repo processing requested for user: ${userId}, repository: ${repoId}`);
      
      // Construct repoData from the provided parameters
      const constructedRepoData = {
        githubOwner: githubOwner || repoId.split('/')[0],
        repoName: repoName || repoId.split('/')[1],
        repoUrl: repoUrl || `https://github.com/${repoId}`,
        branch: branch,
        description: `Manual processing of ${repoId}`,
        timestamp: new Date().toISOString()
      };
      
      // Validate constructed data
      if (!constructedRepoData.githubOwner || !constructedRepoData.repoName) {
        throw new Error('Invalid repoId format or missing githubOwner/repoName. Expected format: "owner/repo-name"');
      }
      
      fastify.log.info(`Constructed repo data:`, constructedRepoData);
      
      // Ensure diScope is available
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ Created diScope manually as fallback');
      }
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      // Process the repository directly using AI service
      const response = await aiService.processPushedRepo(userId, repoId, constructedRepoData);
      
      fastify.log.info(`Manual direct repo processing completed: ${repoId}`);
      
      return {
        success: true,
        message: 'Repository processed successfully via direct method',
        repoId,
        repoData: constructedRepoData,
        data: response
      };
    } catch (error) {
      fastify.log.error('Error in manual direct repo processing:', error);
      throw fastify.httpErrors.internalServerError('Failed to process repository manually', { cause: error });
    }
  });

  // Text search endpoint handler
  fastify.decorate('searchText', async (request, reply) => {
    try {
      const { query, repoId, limit = 10, offset = 0 } = request.query;
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`🔍 AI Controller: Text search for user ${userId}, query: "${query}"`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.textSearchService) {
        const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
        await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const results = await aiService.aiAdapter.searchText(query, {
        repoId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      return {
        results,
        query,
        totalResults: results.length,
        searchType: 'text'
      };
    } catch (error) {
      fastify.log.error('Error in text search:', error);
      throw fastify.httpErrors.internalServerError('Text search failed', { cause: error });
    }
  });

  // Hybrid search endpoint handler
  fastify.decorate('searchHybrid', async (request, reply) => {
    try {
      const { 
        query, 
        repoId, 
        limit = 10, 
        includeVector = true, 
        includeText = true, 
        strategy = 'interleave' 
      } = request.query;
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`🔄 AI Controller: Hybrid search for user ${userId}, query: "${query}"`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.hybridSearchService) {
        const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
        await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const results = await aiService.aiAdapter.searchHybrid(query, {
        repoId,
        limit: parseInt(limit),
        includeVector: includeVector === 'true',
        includeText: includeText === 'true',
        strategy
      });

      // Calculate search stats
      const vectorResults = results.filter(r => r.searchType === 'vector').length;
      const textResults = results.filter(r => r.searchType === 'text' || r.searchType === 'simple_text').length;
      
      return {
        results,
        query,
        totalResults: results.length,
        searchType: 'hybrid',
        searchStats: {
          vectorResults,
          textResults
        }
      };
    } catch (error) {
      fastify.log.error('Error in hybrid search:', error);
      throw fastify.httpErrors.internalServerError('Hybrid search failed', { cause: error });
    }
  });

  // Search capabilities endpoint handler
  fastify.decorate('getSearchCapabilities', async (request, reply) => {
    try {
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`📊 AI Controller: Getting search capabilities for user ${userId}`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.textSearchService) {
        try {
          const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
          await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
        } catch (error) {
          fastify.log.warn('Could not initialize text search for capabilities check:', error.message);
        }
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const capabilities = await aiService.aiAdapter.getSearchCapabilities();
      
      return capabilities;
    } catch (error) {
      fastify.log.error('Error getting search capabilities:', error);
      throw fastify.httpErrors.internalServerError('Failed to get search capabilities', { cause: error });
    }
  });

  // Test search systems endpoint handler
  fastify.decorate('testSearchSystems', async (request, reply) => {
    try {
      const { testQuery = 'function' } = request.body || {};
      const userId = request.user?.id || request.userId;
      
      fastify.log.info(`🧪 AI Controller: Testing search systems for user ${userId} with query: "${testQuery}"`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }

      // Initialize text search if not already done
      if (!aiService.aiAdapter.textSearchService) {
        try {
          const postgresAdapter = await request.diScope.resolve('aiPersistAdapter');
          await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
        } catch (error) {
          fastify.log.warn('Could not initialize text search for testing:', error.message);
        }
      }

      // Set userId if needed
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }

      const testResults = await aiService.aiAdapter.testSearchSystems(testQuery);
      
      return testResults;
    } catch (error) {
      fastify.log.error('Error testing search systems:', error);
      throw fastify.httpErrors.internalServerError('Failed to test search systems', { cause: error });
    }
  });

}

module.exports = fp(aiController);
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.39998439,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:34252dea0c111df7"
}
```

---

### Chunk 2/5
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 4198 characters
- **Score**: 0.395835876
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// ai/index.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('path');
const autoload = require('@fastify/autoload');
const aiPubsubListener = require('./input/aiPubsubListener');

module.exports = async function aiModuleIndex(fastify, opts) {
  fastify.log.info('✅ ai/index.js was registered');

  const allFiles = fs.readdirSync(__dirname);
  fastify.log.info(`Files in ai_module: ${JSON.stringify(allFiles)}`);

  // Load application controllers
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
    dirNameRoutePrefix: false
  });

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: true,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
    prefix: ''
  });

  // First, let's ensure eventDispatcher is available by checking the DI container
  let eventDispatcherFound = false;
  
  if (fastify.diContainer) {
    try {
      // Log all registrations in debug mode to help troubleshoot
      try {
        const allRegistrations = await fastify.diContainer.listRegistrations();
        fastify.log.debug(`🔍 AI MODULE: DI container has the following registrations: ${JSON.stringify(allRegistrations)}`);
      } catch (listError) {
        fastify.log.debug(`⚠️ AI MODULE: Could not list DI registrations: ${listError.message}`);
      }

      if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
        const eventDispatcher = await fastify.diContainer.resolve('eventDispatcher');
        // Make sure we don't overwrite an existing decorator
        if (!fastify.hasDecorator('eventDispatcher')) {
          fastify.decorate('eventDispatcher', eventDispatcher);
          fastify.log.info('✅ AI MODULE: eventDispatcher found in DI container and registered as decorator');
        } else {
          fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists, not overwriting');
        }
        eventDispatcherFound = true;
      } else {
        fastify.log.warn('⚠️ AI MODULE: eventDispatcher not found in DI container, trying direct import');
        
        // Try to import directly from eventDispatcher.js
        try {
          const { eventDispatcher } = require('../../eventDispatcher');
          if (eventDispatcher) {
            if (!fastify.hasDecorator('eventDispatcher')) {
              fastify.decorate('eventDispatcher', eventDispatcher);
              fastify.log.info('✅ AI MODULE: eventDispatcher imported directly and registered as decorator');
            } else {
              fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists (from direct import)');
            }
            eventDispatcherFound = true;
          }
        } catch (importError) {
          fastify.log.error(`❌ AI MODULE: Failed to import eventDispatcher: ${importError.message}`);
        }
      }
    } catch (diError) {
      fastify.log.error(`❌ AI MODULE: Error accessing DI container: ${diError.message}`);
    }
  } else {
    fastify.log.error('❌ AI MODULE: DI container not available');
  }
  
  // Register the AI pubsub listener
  await fastify.register(aiPubsubListener);
  fastify.log.info(`aiPubsubListener registered: ${!!fastify.aiPubsubListener}`);
  
  // Check if event dispatcher is available - check both the decorator and the DI container flag
  if (fastify.eventDispatcher) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available as a fastify decorator');
  } else if (eventDispatcherFound) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available through the DI container');
  } else if (fastify.diContainer && await fastify.diContainer.hasRegistration('eventDispatcher')) {
    // One final check directly with the DI container
    fastify.log.info('✅ AI MODULE: eventDispatcher is available in the DI container');
  } else {
    fastify.log.error('❌ AI MODULE: eventDispatcher is NOT available through any source');
  }
 

};

module.exports.autoPrefix = '/api/ai';
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.395835876,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:77a1b863d9556d37"
}
```

---

### Chunk 3/5
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 10143 characters
- **Score**: 0.374490738
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// AIService.js
/* eslint-disable no-unused-vars */
'use strict';

const IAIService = require('./interfaces/IAIService');
const AIResponse = require('../../domain/entities/aiResponse');
const PushedRepo = require('../../domain/entities/pushedRepo');
const UserId = require('../../domain/value_objects/userId');
const RepoId = require('../../domain/value_objects/repoId');
const Prompt = require('../../domain/value_objects/prompt');
const AiResponseGeneratedEvent = require('../../domain/events/aiResponseGeneratedEvent');
const RepoPushedEvent = require('../../domain/events/repoPushedEvent');

class AIService extends IAIService {
  constructor({ aiAdapter, aiPersistAdapter, aiMessagingAdapter }) {
    super();
    this.aiAdapter = aiAdapter;
    this.aiPersistAdapter = aiPersistAdapter;
    this.aiMessagingAdapter = aiMessagingAdapter;
    
    // Initialize text search if postgres adapter is available and text search not yet initialized
    if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
      // Don't block constructor, initialize asynchronously
      setImmediate(async () => {
        try {
          // Check if already initialized
          if (!this.aiAdapter.textSearchService) {
            await this.aiAdapter.initializeTextSearch(this.aiPersistAdapter);
            console.log(`[${new Date().toISOString()}] ✅ Text search initialized in AIService constructor`);
          }
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️  Could not initialize text search: ${error.message}`);
        }
      });
    }
  }

  async respondToPrompt(userId, conversationId, prompt) {
    try {
      const userIdVO = new UserId(userId);
      const promptVO = new Prompt(prompt);
      console.log(`[${new Date().toISOString()}] AI service processing prompt for user ${userIdVO.value}: "${promptVO.text.substring(0, 50)}..."`);
      
      // Retrievee conversation history from database (Clean Architecture: Service handles data access)
      let conversationHistory = [];
      if (this.aiPersistAdapter && conversationId) {
        try {
          conversationHistory = await this.aiPersistAdapter.getConversationHistory(conversationId, 8);
          console.log(`[${new Date().toISOString()}] Retrieved ${conversationHistory.length} conversation history items`);
        } catch (historyError) {
          console.warn(`[${new Date().toISOString()}] Could not retrieve conversation history:`, historyError.message);
          conversationHistory = [];
        }
      }
      
      // Call the domain entity to get the response and event
      const aiResponse = new AIResponse(userIdVO);
      const { response } = await aiResponse.respondToPrompt(userIdVO, conversationId, promptVO, this.aiAdapter, conversationHistory);
      // Create and publish domain event
      const event = new AiResponseGeneratedEvent({
        userId: userIdVO.value,
        conversationId,
        prompt: promptVO.text,
        response
      });
      if (this.aiMessagingAdapter) {
        try {
          await this.aiMessagingAdapter.publishAiResponse('aiResponseGenerated', event);
        } catch (messagingError) {
          console.error('Error publishing AiResponseGeneratedEvent:', messagingError);
        }
      }
      // Save the response to the database - but don't block on failure
      try {
        if (this.aiPersistAdapter) {
          await this.aiPersistAdapter.saveAiResponse({
            userId: userIdVO.value, 
            conversationId, 
            repoId: null, // Optional field
            prompt: promptVO.text, 
            response: typeof response === 'object' ? JSON.stringify(response) : response
          });
          console.log(`[${new Date().toISOString()}] Saved AI response to database`);
        } else {
          console.warn(`[${new Date().toISOString()}] aiPersistAdapter is not available, skipping database save`);
        }
      } catch (dbError) {
        console.error(`[${new Date().toISOString()}] Failed to save AI response to database:`, dbError.message);
        // Continue even if database save fails - don't rethrow
      }
      // Return the response - extract content if it's an object with response property
      if (typeof response === 'object' && response !== null) {
        return response.response || response;
      }
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in AI service:`, error);
      
      // Check if it's an OpenAI API error related to quotas
      if (error.message && (
          error.message.includes('quota') || 
          error.message.includes('rate limit') || 
          error.message.includes('429')
        )) {
        return {
          success: false,
          response: "I'm currently experiencing high demand. Please try again in a few moments while I optimize my resources.",
          error: error.message
        };
      }
      
      // For any other error, let's provide a cleaner message
      return {
        success: false,
        response: "Sorry, I encountered a technical issue. Please try again shortly.",
        error: error.message
      };
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    try {
      const userIdVO = new UserId(userId);
      const repoIdVO = new RepoId(repoId);
      console.log(`[${new Date().toISOString()}] Processing pushed repository for user: ${userIdVO.value}, repository: ${repoIdVO.value}`);
      
      // CRITICAL: Ensure text search is initialized before processing repo
      if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
        if (!this.aiAdapter.textSearchService) {
          console.log(`[${new Date().toISOString()}] 🔍 Initializing text search before repo processing...`);
          try {
            await this.aiAdapter.initializeTextSearch(this.aiPersistAdapter);
            console.log(`[${new Date().toISOString()}] ✅ Text search initialized successfully before repo processing`);
          } catch (error) {
            console.warn(`[${new Date().toISOString()}] ⚠️  Text search initialization failed (non-fatal): ${error.message}`);
          }
        } else {
          console.log(`[${new Date().toISOString()}] ℹ️  Text search already initialized`);
        }
      }
      
      const pushedRepo = new PushedRepo(userIdVO, repoIdVO);
      const { response } = await pushedRepo.processPushedRepo(userIdVO, repoIdVO, repoData, this.aiAdapter);
      // Create and publish domain event
      const event = new RepoPushedEvent({
        userId: userIdVO.value,
        repoId: repoIdVO.value,
        repoData
      });
      if (this.aiMessagingAdapter) {
        try {
          await this.aiMessagingAdapter.publishAiResponse('repoPushed', event);
        } catch (messagingError) {
          console.error('Error publishing RepoPushedEvent:', messagingError);
        }
      }
      // Save the data to the database
      try {
        if (this.aiPersistAdapter) {
          await this.aiPersistAdapter.saveRepoPush({
            userId: userIdVO.value,
            repoId: repoIdVO.value,
            repoData,
            response: typeof response === 'object' ? JSON.stringify(response) : response
          });
          console.log(`[${new Date().toISOString()}] Saved pushed repo to database`);
        } else {
          console.warn(`[${new Date().toISOString()}] aiPersistAdapter is not available, skipping database save`);
        }
      } catch (dbError) {
        console.error(`[${new Date().toISOString()}] Failed to save pushed repo to database:`, dbError.message);
        // Continue even if database save fails - don't rethrow
      }
      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing repository:`, error);
      throw error;
    }
  }
  
  // New method to handle question generation from events
  async generateResponse(prompt, userId) {
    console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Generating response for user ${userId}, prompt: "${prompt.substring(0, 100)}..."`);
    
    try {
      // Set the userId on the adapter if it's not already set
      if (this.aiAdapter && this.aiAdapter.setUserId) {
        await this.aiAdapter.setUserId(userId);
        console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Set userId ${userId} on AI adapter`);
      } else {
        console.warn(`[${new Date().toISOString()}] 🤖 AI SERVICE: Unable to set userId - aiAdapter missing or lacks setUserId method`);
        // Continue anyway - it might still work
      }
      
      // Validate the prompt
      if (!prompt) {
        console.error(`[${new Date().toISOString()}] 🤖 AI SERVICE: Empty prompt received, returning default response`);
        return "I'm sorry, but I didn't receive a question to answer. Could you please ask again?";
      }
      
      // Use the existing respondToPrompt method with a generated conversation ID if none was provided
      const conversationId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const response = await this.respondToPrompt(userId, conversationId, prompt);
      
      if (response) {
        const responseText = typeof response === 'object' ? 
          (response.response || JSON.stringify(response)) : 
          response;
          
        console.log(`[${new Date().toISOString()}] 🤖 AI SERVICE: Generated response: "${responseText.substring(0, 100)}..."`);
        return responseText;
      } else {
        console.warn(`[${new Date().toISOString()}] 🤖 AI SERVICE: Got empty response from AI adapter, returning default message`);
        return "I'm sorry, but I couldn't generate a response at this time. Please try again later.";
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 🤖 AI SERVICE: Error generating response:`, error);
      return `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again later.`;
    }
  }
}

module.exports = AIService;
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.374490738,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:3748242fdecdbb5a"
}
```

---

### Chunk 4/5
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 24223 characters
- **Score**: 0.350624084
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// aiLangchainAdapter.js
"use strict";
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Import extracted utility functions
const RequestQueue = require('./requestQueue');
const LLMProviderManager = require('./providers/lLMProviderManager');

// Import the ContextPipeline for handling repository processing
const ContextPipeline = require('./rag_pipelines/context/contextPipeline');
const QueryPipeline = require('./rag_pipelines/query/queryPipeline');

// LangSmith tracing (optional)
let wrapOpenAI, traceable;
try {
  ({ wrapOpenAI } = require('langsmith/wrappers'));
  ({ traceable } = require('langsmith/traceable'));
} catch (err) {
  if (process.env.LANGSMITH_TRACING === 'true') {
    console.warn(`[${new Date().toISOString()}] [TRACE] LangSmith packages not found or failed to load: ${err.message}`);
  }
}

class AILangchainAdapter extends IAIPort {
  constructor(options = {}) {
    super();

    // Make userId null by default to avoid DI error
    this.userId = null;

    // Get provider from infraConfig or options
    this.aiProvider = options.aiProvider || 'openai';
    console.log(`[${new Date().toISOString()}] AILangchainAdapter initializing with provider: ${this.aiProvider}`);

    // Get access to the event bus for status updates
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log(`[${new Date().toISOString()}] 📡 Successfully connected to shared event bus`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Event bus unavailable.`);
    }

    // Initialize request queue for rate limiting and queuing
    this.requestQueue = new RequestQueue({
      maxRequestsPerMinute: 60,  // Increased from 20 to 60 for better throughput
      retryDelay: 2000,          // Reduced from 5000ms to 2000ms for faster retries
      maxRetries: 5              // Increased retries for better reliability
    });

    // Keep direct access to pineconeLimiter for backward compatibility
    this.pineconeLimiter = this.requestQueue.pineconeLimiter;

    try {
      // Initialize embeddings model: converts text to vectors
      this.embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] Embeddings model initialized.`);

      // Initialize chat model based on provider
      this.llmProviderManager = new LLMProviderManager(this.aiProvider, {
        maxRetries: this.requestQueue.maxRetries
      });
      this.llm = this.llmProviderManager.getLLM();
      console.log(`[${new Date().toISOString()}] [DEBUG] LLM initialized.`);

      // LangSmith tracing toggle
      this.enableTracing = process.env.LANGSMITH_TRACING === 'true';
      if (this.enableTracing) {
        console.log(`[${new Date().toISOString()}] [TRACE] LangSmith tracing enabled (adapter level)`);
        console.log(`[${new Date().toISOString()}] [TRACE] LangSmith env summary: project=${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'} apiKeySet=${!!process.env.LANGSMITH_API_KEY} workspaceIdSet=${!!process.env.LANGSMITH_WORKSPACE_ID} organizationName=${process.env.LANGSMITH_ORGANIZATION_NAME || 'n/a'}`);
      }

      // Attempt to wrap underlying OpenAI client if available & tracing enabled
      if (this.enableTracing && this.aiProvider === 'openai' && wrapOpenAI) {
        try {
          // Common patterns for underlying client reference
          if (this.llm?.client) {
            this.llm.client = wrapOpenAI(this.llm.client);
            console.log(`[${new Date().toISOString()}] [TRACE] Wrapped this.llm.client with LangSmith`);
          } else if (this.llm?._client) {
            this.llm._client = wrapOpenAI(this.llm._client);
            console.log(`[${new Date().toISOString()}] [TRACE] Wrapped this.llm._client with LangSmith`);
          } else {
            console.log(`[${new Date().toISOString()}] [TRACE] No direct raw OpenAI client found to wrap (LangChain may auto-instrument).`);
          }
        } catch (wrapErr) {
          console.warn(`[${new Date().toISOString()}] [TRACE] Failed to wrap OpenAI client: ${wrapErr.message}`);
        }
      }

      // Don't initialize vectorStore until we have a userId
      this.vectorStore = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store set to null (will be initialized after userId).`);

      // Initialize ContextPipeline for repository processing
      this.contextPipeline = new ContextPipeline({
        embeddings: this.embeddings,
        eventBus: this.eventBus,
        pineconeLimiter: this.pineconeLimiter,
        maxChunkSize: 1500,  // Optimized for better semantic chunking and embedding quality
        chunkOverlap: 200    // Add overlap for better context preservation
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] ContextPipeline initialized with embedded Pinecone services.`);

  // System documentation is processed via the normal docs pipeline when triggered

      // Initialize shared Pinecone resources that will be used by QueryPipeline
      this.pineconePlugin = null;
      this.vectorSearchOrchestrator = null;
      if (process.env.PINECONE_API_KEY) {
        const PineconePlugin = require('./rag_pipelines/context/embedding/pineconePlugin');
        const VectorSearchOrchestrator = require('./rag_pipelines/query/vectorSearchOrchestrator');
        
        this.pineconePlugin = new PineconePlugin();
        this.vectorSearchOrchestrator = new VectorSearchOrchestrator({
          embeddings: this.embeddings,
          rateLimiter: this.requestQueue?.pineconeLimiter,
          pineconePlugin: this.pineconePlugin,
          apiKey: process.env.PINECONE_API_KEY,
          indexName: process.env.PINECONE_INDEX_NAME,
          region: process.env.PINECONE_REGION,
          defaultTopK: 10,
          defaultThreshold: 0.3,
          maxResults: 50
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Shared Pinecone resources initialized in AILangchainAdapter`);
      } else {
        console.warn(`[${new Date().toISOString()}] Missing Pinecone API key - vector services not initialized`);
      }

      // Initialize text search services
      this.textSearchService = null;
      this.hybridSearchService = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Text search services will be initialized after PostgresAdapter is available`);

      // Initialize QueryPipeline with shared Pinecone resources (no duplication)
      this.queryPipeline = new QueryPipeline({  
        embeddings: this.embeddings,
        llm: this.llm,
        eventBus: this.eventBus,
        requestQueue: this.requestQueue,
        maxRetries: this.requestQueue.maxRetries,
        // Pass shared Pinecone resources to avoid duplication
        pineconePlugin: this.pineconePlugin,
        vectorSearchOrchestrator: this.vectorSearchOrchestrator
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline initialized in constructor`);

      console.log(`[${new Date().toISOString()}] AILangchainAdapter initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing AILangchainAdapter:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Initialization error stack:`, error.stack);
      // We'll continue with degraded functionality and try to recover later
    }
  }

  /**
   * Extract GitHub user and repository name from various sources
   * This ensures consistent namespace generation across the system
   */
  extractGitHubInfo() {
    // Try to extract from environment variables first (most reliable)
    const envUser = process.env.GITHUB_USERNAME || process.env.GITHUB_USER;
    const envRepo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY_NAME;
    
    if (envUser && envRepo) {
      return {
        gitUser: envUser,
        gitRepo: envRepo
      };
    }

    // Try to extract from git config (local repository)
    try {
      const { execSync } = require('child_process');
      
      // Get remote origin URL
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      // Parse GitHub URL (supports both HTTPS and SSH formats)
      const githubMatch = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (githubMatch) {
        return {
          gitUser: githubMatch[1], // Preservesss original case
          gitRepo: githubMatch[2]
        };
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] Could not extract GitHub info from git config: ${error.message}`);
    }

    // Fallback to known correct values for this repository
    return {
      gitUser: 'anatolyZader', // Actual GitHub username (with capital Z)
      gitRepo: 'vc-3'
    };
  }

  // Add method to set userId after construction - this is crucial!
  async setUserId(userId) {
    if (!userId) {
      console.warn(`[${new Date().toISOString()}] Attempted to set null/undefined userId in AILangchainAdapter`);
      return this;
    }
    console.log(`[${new Date().toISOString()}] [DEBUG] setUserId called with: ${userId}`);

    this.userId = userId;
    console.log(`[${new Date().toISOString()}] [DEBUG] userId set to: ${this.userId}`);


    try {
      // Create vector store using shared Pinecone resources
      if (this.vectorSearchOrchestrator) {
        // TEMPORARY FIX: Hardcode the complete namespace that exists in Pinecone
        const repositoryNamespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        console.log(`[${new Date().toISOString()}] [DEBUG] TEMP FIX: Using hardcoded namespace: ${repositoryNamespace}`);
        this.vectorStore = await this.vectorSearchOrchestrator.createVectorStore(this.userId);
        // Override with correct namespace
        this.vectorStore.namespace = repositoryNamespace;
        console.log(`[${new Date().toISOString()}] [DEBUG] Vector store created using shared orchestrator for userId: ${this.userId} with namespace: ${repositoryNamespace}`);
      } else {
        console.warn(`[${new Date().toISOString()}] No shared VectorSearchOrchestrator available - vector store not initialized`);
        this.vectorStore = null;
      }

      // Update QueryPipeline with userId and vectorStore
      if (this.queryPipeline) {
        this.queryPipeline.userId = this.userId;
        this.queryPipeline.vectorStore = this.vectorStore;
        console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline updated with userId: ${this.userId} and vectorStore`);
      } else {
        console.warn(`[${new Date().toISOString()}] [DEBUG] QueryPipeline not found during setUserId - this should not happen`);
      }
      
      console.log(`[${new Date().toISOString()}] AILangchainAdapter userId updated to: ${this.userId}`);
      console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline ready for userId: ${this.userId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating vector store for user ${this.userId}:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store creation error stack:`, error.stack);
      // Still set the userId even if vectorStore creation fails
    }

    return this;
  }

  /**
   * Initialize text search services with PostgreSQL adapter
   * Call this method after PostgreSQL adapter is available in DI container
   */
  async initializeTextSearch(postgresAdapter) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Initializing text search services...`);
      
      const TextSearchService = require('../search/textSearchService');
      const HybridSearchService = require('../search/hybridSearchService');
      
      this.textSearchService = new TextSearchService({ 
        postgresAdapter,
        logger: console 
      });

      this.hybridSearchService = new HybridSearchService({
        vectorSearchOrchestrator: this.vectorSearchOrchestrator,
        textSearchService: this.textSearchService,
        logger: console
      });

      console.log(`[${new Date().toISOString()}] ✅ Text search services initialized successfully`);
      
      // Update QueryPipeline with text search services for hybrid search
      if (this.queryPipeline) {
        this.queryPipeline.textSearchService = this.textSearchService;
        this.queryPipeline.hybridSearchService = this.hybridSearchService;
        console.log(`[${new Date().toISOString()}] 🔄 QueryPipeline updated with text search services`);
      }
      
      // Update ContextPipeline with text search service for PostgreSQL storage
      if (this.contextPipeline) {
        this.contextPipeline.textSearchService = this.textSearchService;
        console.log(`[${new Date().toISOString()}] 🔄 ContextPipeline updated with text search service for PostgreSQL storage`);
      }
      
      // Test the services
      const isTextSearchAvailable = await this.textSearchService.isAvailable();
      console.log(`[${new Date().toISOString()}] 📊 Text search availability: ${isTextSearchAvailable}`);
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize text search services:`, error.message);
      return false;
    }
  }

  // RAG Data Preparation Phase: Loading, chunking, and embedding (both core docs and repo code)
  async processPushedRepo(userId, repoId, repoData) {
    const { safeLog, createRepoDataSummary } = require('./rag_pipelines/context/utils/safeLogger');
    
    console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Processing repo for user ${userId}: ${repoId}`);
    safeLog(`[${new Date().toISOString()}] 📥 RAG REPO: Received repoData structure:`, repoData); 
    
    // Emit starting status
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });

    // Set userId if not already set
    if (this.userId !== userId) {
      await this.setUserId(userId);
    }

    try {
      console.log(`[${new Date().toISOString()}] � RAG REPO: Delegating to ContextPipeline with ubiquitous language support`);
      
      const result = await this.contextPipeline.processPushedRepo(userId, repoId, repoData);
      
      // Emit success status
      this.emitRagStatus('processing_completed', {
        userId,
        repoId,
        timestamp: new Date().toISOString(),
        result
      });

      console.log(`[${new Date().toISOString()}] ✅ RAG REPO: Repository processing completed with ubiquitous language enhancement`);
      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing repository ${repoId}:`, error.message);
      
      // Emit error status
      this.emitRagStatus('processing_error', {
        userId,
        repoId,
        error: error.message,
        phase: 'repository_processing',
        processedAt: new Date().toISOString()
      });
      
      return {
        success: false,
        error: `Repository processing failed: ${error.message}`,
        userId: userId,
        repoId: repoId,
        processedAt: new Date().toISOString()
      };
    }
  }

  // 2. Retrieval anddd generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    const exec = async () => {
      await this.setUserId(userId);
      if (!this.userId) {
        console.warn(`[${new Date().toISOString()}] Failed to set userId in respondToPrompt. Provided userId: ${userId}`);
        return {
          success: false,
          response: "I'm having trouble identifying your session. Please try again in a moment.",
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        };
      }

      console.log(`[${new Date().toISOString()}] Processing AI request for conversation ${conversationId}`);

      // Use the queue system for all AI operations
      return this.requestQueue.queueRequest(async () => {
        try {
          // Delegate to QueryPipeline for RAG processing
          const result = await this.queryPipeline.respondToPrompt(
            userId,
            conversationId,
            prompt,
            conversationHistory,
            this.vectorStore,
            null // TODO: Pass proper repository descriptor when available
          );
          return result;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error in respondToPrompt:`, error.message);
          return {
            success: false,
            response: "I encountered an issue while processing your request. Please try again shortly.",
            conversationId,
            timestamp: new Date().toISOString(),
            error: error.message
          };
        }
      });
    };

    if (this.enableTracing && traceable) {
      try {
        const traced = traceable(exec, {
          name: 'AIAdapter.respondToPrompt',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { userId, conversationId },
            tags: ['rag', 'adapter', 'query']
        });
        return traced();
      } catch (traceErr) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to trace respondToPrompt: ${traceErr.message}`);
      }
    }
    return exec();
  }

  /**
   * Perform text search using PostgreSQL
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Text search results
   */
  async searchText(query, options = {}) {
    if (!this.textSearchService) {
      throw new Error('Text search service not initialized. Call initializeTextSearch() first.');
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔍 Performing text search: "${query}"`);
      
      const results = await this.textSearchService.searchDocuments(query, {
        userId: this.userId,
        ...options
      });
      
      console.log(`[${new Date().toISOString()}] 📄 Text search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Text search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Perform hybrid search combining vector and text search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Combined search results
   */
  async searchHybrid(query, options = {}) {
    if (!this.hybridSearchService) {
      throw new Error('Hybrid search service not initialized. Call initializeTextSearch() first.');
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔄 Performing hybrid search: "${query}"`);
      
      // Add user's namespace for vector search
      const searchOptions = {
        userId: this.userId,
        namespace: this.vectorStore?.namespace,
        ...options
      };

      const results = await this.hybridSearchService.search(query, searchOptions);
      
      console.log(`[${new Date().toISOString()}] 🎯 Hybrid search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Hybrid search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get search capabilities and statistics
   * @returns {object} Information about available search capabilities
   */
  async getSearchCapabilities() {
    const capabilities = {
      vectorSearch: {
        available: !!this.vectorSearchOrchestrator,
        connected: this.vectorSearchOrchestrator?.isConnected() || false
      },
      textSearch: {
        available: !!this.textSearchService,
        connected: false
      },
      hybridSearch: {
        available: !!this.hybridSearchService
      }
    };

    // Check text search connectivity
    if (this.textSearchService) {
      try {
        capabilities.textSearch.connected = await this.textSearchService.isAvailable();
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Could not check text search availability:`, error.message);
      }
    }

    // Get detailed capabilities from hybrid service if available
    if (this.hybridSearchService) {
      try {
        const detailedCapabilities = await this.hybridSearchService.getSearchCapabilities(this.userId);
        capabilities.detailed = detailedCapabilities;
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Could not get detailed search capabilities:`, error.message);
      }
    }

    return capabilities;
  }

  /**
   * Test search functionality
   * @param {string} testQuery - Query to test with
   * @returns {object} Test results from all search systems
   */
  async testSearchSystems(testQuery = 'function') {
    const results = {
      vectorSearch: { available: false, success: false, results: [], error: null },
      textSearch: { available: false, success: false, results: [], error: null },
      hybridSearch: { available: false, success: false, results: [], error: null }
    };

    // Test vector search
    if (this.vectorSearchOrchestrator) {
      results.vectorSearch.available = true;
      try {
        const vectorResults = await this.vectorSearchOrchestrator.searchSimilar(testQuery, {
          namespace: this.vectorStore?.namespace,
          topK: 3,
          threshold: 0.3
        });
        results.vectorSearch.success = true;
        results.vectorSearch.results = vectorResults;
      } catch (error) {
        results.vectorSearch.error = error.message;
      }
    }

    // Test text search
    if (this.textSearchService) {
      results.textSearch.available = true;
      try {
        const textResults = await this.textSearchService.searchDocumentsSimple(testQuery, { 
          userId: this.userId, 
          limit: 3 
        });
        results.textSearch.success = true;
        results.textSearch.results = textResults;
      } catch (error) {
        results.textSearch.error = error.message;
      }
    }

    // Test hybrid search
    if (this.hybridSearchService) {
      results.hybridSearch.available = true;
      try {
        const hybridResults = await this.hybridSearchService.testSearchSystems(testQuery);
        results.hybridSearch.success = true;
        results.hybridSearch.results = hybridResults;
      } catch (error) {
        results.hybridSearch.error = error.message;
      }
    }

    return results;
  }

  /**
   * Emit RAG status events for monitoring
   */
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      const payload = {
        component: 'aiLangchainAdapter',
        phase: status,
        metrics: details,
        ts: new Date().toISOString()
      };

      // First try the instance event bus
      if (this.eventBus) {
        this.eventBus.emit('rag.status', payload);
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('rag.status', payload);
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }

  /**
   * Manually trigger system documentation processing
   * Useful for refreshing documentation or debugging
   */
  // (No manual system documentation startup here; the DocsProcessor can be invoked where appropriate.)
}

module.exports = AILangchainAdapter;
```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.350624084,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:9ca198d32100df07"
}
```

---

### Chunk 5/5
- **Source**: anatolyZader/vc-3
- **Type**: github-code
- **Size**: 1113 characters
- **Score**: 0.308506
- **Repository**: N/A
- **Branch**: N/A
- **File Type**: N/A
- **Processed At**: N/A

**🏷️ Ubiquitous Language Tags**: ❌ Missing

⚠️ **Warning**: This chunk is missing ubiquitous language tags. This may indicate:
  - The file was indexed before UL enhancement was implemented
  - The file is a non-code file (markdown, config) that bypassed UL processing
  - There was an error during UL enhancement
  - Repository needs re-indexing to pick up UL tags


**Full Content**:
```
// aiResponse.js
/* eslint-disable no-unused-vars */

'use strict';

const AiResponseGeneratedEvent = require('../events/aiResponseGeneratedEvent');
const UserId = require('../value_objects/userId');
const Prompt = require('../value_objects/prompt');

class AIResponse {
  constructor(userId) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    this.userId = userId;
  }

  async respondToPrompt(userId, conversationId, prompt, IAIPort, conversationHistory = []) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    if (!(prompt instanceof Prompt)) throw new Error('prompt must be a Prompt value object');
    const response = await IAIPort.respondToPrompt(userId.value, conversationId, prompt.text, conversationHistory);
    console.log(`AI Response received: ${response}`);
    // Emit domain event
    const event = new AiResponseGeneratedEvent({
      userId: userId.value,
      conversationId,
      prompt: prompt.text,
      response
    });
    return { response, event };
  }
}

module.exports = AIResponse;

```

**Metadata**:
```json
{
  "file_path": "anatolyZader/vc-3",
  "file_type": "unknown",
  "repoId": "anatolyZader/vc-3",
  "source": "anatolyZader/vc-3",
  "type": "github-code",
  "ubiq_enhanced": false,
  "score": 0.308506,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3:anatolyzader_vc-3:d5ea7b9b00722854"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 834 characters
**Generated At**: 2025-11-03T16:12:03.893Z

### Response Content:
```markdown
Based on the provided code, I can see the following methods in the `ai` module:

1. `respondToPrompt` method in the `AIResponse` class:
```javascript
async respondToPrompt(userId, conversationId, prompt, IAIPort, conversationHistory = []) {
  // Implementation details
}
```

2. `initializeTextSearch` method in the `AIService` class (though it's not directly called in the code shown):
```javascript
if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
  // Initialize text search asynchronously
  setImmediate(async () => {
    // Implementation details
  });
}
```

I don't see any other specific method implementations in the code provided. If there are other methods you're interested in, please let me know, and I'll be happy to take a closer look at the available context.
```

### Response Quality Assessment:
- **Relevance to Query**: MEDIUM - Partially addresses query
- **Use of Context**: MEDIUM - Implicit context usage
- **Response Completeness**: GOOD - Structured with adequate detail

### Key Response Elements:
- **Code Examples**: 2 code blocks included
- **Structured Lists**: 2 numbered points
- **Technical Terms**: 7 technical concepts used

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 4223ms
- **Documents Retrieved**: 5
- **Unique Sources**: 1
- **Average Raw Chunk Size**: 10358 characters (original)
- **Average Formatted Chunk Size**: 1461 characters (sent to LLM)

### Context Quality:
- **Relevance Score**: HIGH (5 relevant chunks found)
- **Diversity Score**: LOW (1 unique sources)
- **Raw Content Size**: 51,792 characters (retrieved from vector DB)
- **Formatted Context Size**: 7,303 characters (actually sent to LLM)
- **Context Efficiency**: 14% (lower = more truncation/formatting overhead)

### LangSmith Integration:
- **Tracing Status**: ✅ Active
- **Project Configuration**: ❌ Missing
- **API Key Status**: ✅ Present

## 🔍 Source Analysis

### Most Frequent Sources:
- **anatolyZader/vc-3**: 5 chunks

### Repository Coverage:
- No repository sources detected

## 🎯 Query Classification & Analysis

- **Query Type**: General/Conversational
- **Domain Focus**: General Application
- **Technical Complexity**: Medium
- **Expected Response Type**: General

## 🚀 Recommendations

- **Increase Source Diversity**: All chunks from same source, consider broader indexing

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates excellent RAG performance with:
- **Retrieval Quality**: Good
- **Context Diversity**: Medium
- **Raw Content Retrieved**: 51,792 characters from vector database
- **Formatted Context Sent**: 7,303 characters to LLM
- **Context Efficiency**: 14% (truncation applied)
- **Response Quality**: Comprehensive

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-11-03T16:12:03.894Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
