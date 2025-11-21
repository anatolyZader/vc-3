---
**ARCHIVED TRACE ANALYSIS**
- Archived on: 2025-10-25T12:35:03.693Z
- Triggered by query: "explain the main methods in app.js"
- Original file: latest-trace-analysis.md
---

# LangSmith RAG Trace Analysis - 10/25/2025, 12:23:48 PM

## 🔍 Query Details
- **Query**: "which important methods are used and for what purpose in ai module?"
- **User ID**: d41402df-182a-41ec-8f05-153118bf2718
- **Conversation ID**: c6cca43e-6d4c-457d-b57a-cec910c58d69
- **Started**: 2025-10-25T12:23:48.824Z
- **Completed**: 2025-10-25T12:23:52.057Z
- **Total Duration**: 3233ms

## 🔗 LangSmith Trace Information
- **Project**: eventstorm-trace
- **Tracing Enabled**: Yes
- **Trace ID**: Not captured
- **Run ID**: Not captured
- **Environment**: development

### Pipeline Execution Steps:
1. **initialization** (2025-10-25T12:23:48.824Z) - success
2. **vector_store_check** (2025-10-25T12:23:48.824Z) - success
3. **vector_search** (2025-10-25T12:23:49.606Z) - success - Found 4 documents
4. **text_search** (2025-10-25T12:23:49.606Z) - skipped
5. **context_building** (2025-10-25T12:23:49.606Z) - success - Context: 5914 chars
6. **response_generation** (2025-10-25T12:23:52.057Z) - success - Response: 1187 chars

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: primary
- **Search Strategy**: intelligent_strategy_with_filters
- **Documents Retrieved**: 4
- **Total Context**: 18,444 characters

### Source Type Distribution:
- **GitHub Repository Code**: 4 chunks (100%)
- **Module Documentation**: 0 chunks (0%)  
- **Architecture Documentation**: 0 chunks (0%)
- **API Specification**: 0 chunks (0%)
- **Other Sources**: 0 chunks (0%)

## 📋 Complete Chunk Analysis


### Chunk 1/4
- **Source**: anatolyZader/vc-3
- **Type**: github-file
- **Size**: 2317 characters
- **Score**: 0.56505394
- **Repository**: anatolyZader/vc-3
- **Branch**: main
- **File Type**: N/A
- **Processed At**: 2025-10-18T13:45:06.495Z

**Full Content**:
```
# AI Module

## Overview

The `ai` module is a key component of the application, responsible for handling all AI-related functionality. It serves as the entry point for the AI-related features and integrates with various other modules and services within the application.

## Architecture

The `ai` module follows a modular architecture, with the main entry point being the `ai/index.js` file. This file is responsible for:

1. Registering the `ai` module with the Fastify application.
2. Loading and registering the application controllers located in the `ai/application` directory.
3. Registering the `aiPubsubListener` module, which listens for and processes AI-related events.
4. Checking the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events.

The `aiController.js` file contains the main logic for processing AI-related requests, including:

- Loading and formatting the API specification summary.
- Loading and incorporating the application docs content.
- Building the context for the AI processing, which includes the code chunks, API specification summary, and docs content.

## Key Functionalities

The `ai` module provides the following key functionalities:

1. **AI Request Processing**: The module is responsible for handling and processing all AI-related requests, such as those related to conversational AI, natural language processing, and other AI-powered features.
2. **API Specification Management**: The module loads and formats the API specification, making it available for use in the AI processing context.
3. **Docs Integration**: The module integrates with the application's docs, loading and incorporating the relevant content into the AI processing context.
4. **Event Handling**: The module registers the `aiPubsubListener` to listen for and process AI-related events, ensuring that the AI functionality is integrated with the rest of the application.
5. **Dependency Management**: The module checks the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events, and logs any issues with its availability.

Overall, the `ai` module is a crucial component of the application, providing the necessary infrastructure and functionality for integrating AI-powered features into the overall system.
```

**Metadata**:
```json
{
  "branch": "main",
  "filePath": "backend/business_modules/ai/ai.md",
  "fileSize": 2317,
  "loaded_at": "2025-10-18T13:45:06.495Z",
  "loading_method": "cloud_native_api",
  "priority": 50,
  "processedAt": "2025-10-18T13:45:06.495Z",
  "repoId": "anatolyZader/vc-3",
  "repository": "anatolyZader/vc-3",
  "sha": "c5a73a1999293593fb641168084c6af907396cf7",
  "size": 2317,
  "source": "anatolyZader/vc-3",
  "text": "# AI Module\n\n## Overview\n\nThe `ai` module is a key component of the application, responsible for handling all AI-related functionality. It serves as the entry point for the AI-related features and integrates with various other modules and services within the application.\n\n## Architecture\n\nThe `ai` module follows a modular architecture, with the main entry point being the `ai/index.js` file. This file is responsible for:\n\n1. Registering the `ai` module with the Fastify application.\n2. Loading and registering the application controllers located in the `ai/application` directory.\n3. Registering the `aiPubsubListener` module, which listens for and processes AI-related events.\n4. Checking the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events.\n\nThe `aiController.js` file contains the main logic for processing AI-related requests, including:\n\n- Loading and formatting the API specification summary.\n- Loading and incorporating the application docs content.\n- Building the context for the AI processing, which includes the code chunks, API specification summary, and docs content.\n\n## Key Functionalities\n\nThe `ai` module provides the following key functionalities:\n\n1. **AI Request Processing**: The module is responsible for handling and processing all AI-related requests, such as those related to conversational AI, natural language processing, and other AI-powered features.\n2. **API Specification Management**: The module loads and formats the API specification, making it available for use in the AI processing context.\n3. **Docs Integration**: The module integrates with the application's docs, loading and incorporating the relevant content into the AI processing context.\n4. **Event Handling**: The module registers the `aiPubsubListener` to listen for and process AI-related events, ensuring that the AI functionality is integrated with the rest of the application.\n5. **Dependency Management**: The module checks the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events, and logs any issues with its availability.\n\nOverall, the `ai` module is a crucial component of the application, providing the necessary infrastructure and functionality for integrating AI-powered features into the overall system.",
  "type": "github-file",
  "userId": "d41402df-182a-41ec-8f05-153118bf2718",
  "workerId": 0,
  "score": 0.56505394,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3_anatolyZader_vc-3_chunk_3703_1760795171204"
}
```

---

### Chunk 2/4
- **Source**: anatolyZader/vc-3
- **Type**: github-file
- **Size**: 4198 characters
- **Score**: 0.387018204
- **Repository**: anatolyZader/vc-3
- **Branch**: main
- **File Type**: N/A
- **Processed At**: 2025-10-25T11:06:19.303Z

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
  "branch": "main",
  "filePath": "backend/business_modules/ai/index.js",
  "fileSize": 4232,
  "loaded_at": "2025-10-25T11:06:19.303Z",
  "loading_method": "cloud_native_api",
  "priority": 80,
  "processedAt": "2025-10-25T11:06:19.303Z",
  "repoId": "anatolyZader/vc-3",
  "repository": "anatolyZader/vc-3",
  "sha": "42dee7dd402b0582a77f6cb5e40cf226d687d75b",
  "size": 4232,
  "source": "anatolyZader/vc-3",
  "text": "// ai/index.js\n'use strict';\n/* eslint-disable no-unused-vars */\n\nconst fp = require('fastify-plugin');\nconst fs = require('fs');\nconst path = require('path');\nconst autoload = require('@fastify/autoload');\nconst aiPubsubListener = require('./input/aiPubsubListener');\n\nmodule.exports = async function aiModuleIndex(fastify, opts) {\n  fastify.log.info('✅ ai/index.js was registered');\n\n  const allFiles = fs.readdirSync(__dirname);\n  fastify.log.info(`Files in ai_module: ${JSON.stringify(allFiles)}`);\n\n  // Load application controllers\n  await fastify.register(autoload, {\n    dir: path.join(__dirname, 'application'),\n    encapsulate: false,\n    maxDepth: 1,\n    matchFilter: (filepath) => filepath.includes('Controller'),\n    dirNameRoutePrefix: false\n  });\n\n  await fastify.register(autoload, {\n    dir: path.join(__dirname, 'input'),\n    encapsulate: true,\n    maxDepth: 1,\n    matchFilter: (filepath) => filepath.includes('Router'),\n    dirNameRoutePrefix: false,\n    prefix: ''\n  });\n\n  // First, let's ensure eventDispatcher is available by checking the DI container\n  let eventDispatcherFound = false;\n  \n  if (fastify.diContainer) {\n    try {\n      // Log all registrations in debug mode to help troubleshoot\n      try {\n        const allRegistrations = await fastify.diContainer.listRegistrations();\n        fastify.log.debug(`🔍 AI MODULE: DI container has the following registrations: ${JSON.stringify(allRegistrations)}`);\n      } catch (listError) {\n        fastify.log.debug(`⚠️ AI MODULE: Could not list DI registrations: ${listError.message}`);\n      }\n\n      if (await fastify.diContainer.hasRegistration('eventDispatcher')) {\n        const eventDispatcher = await fastify.diContainer.resolve('eventDispatcher');\n        // Make sure we don't overwrite an existing decorator\n        if (!fastify.hasDecorator('eventDispatcher')) {\n          fastify.decorate('eventDispatcher', eventDispatcher);\n          fastify.log.info('✅ AI MODULE: eventDispatcher found in DI container and registered as decorator');\n        } else {\n          fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists, not overwriting');\n        }\n        eventDispatcherFound = true;\n      } else {\n        fastify.log.warn('⚠️ AI MODULE: eventDispatcher not found in DI container, trying direct import');\n        \n        // Try to import directly from eventDispatcher.js\n        try {\n          const { eventDispatcher } = require('../../eventDispatcher');\n          if (eventDispatcher) {\n            if (!fastify.hasDecorator('eventDispatcher')) {\n              fastify.decorate('eventDispatcher', eventDispatcher);\n              fastify.log.info('✅ AI MODULE: eventDispatcher imported directly and registered as decorator');\n            } else {\n              fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists (from direct import)');\n            }\n            eventDispatcherFound = true;\n          }\n        } catch (importError) {\n          fastify.log.error(`❌ AI MODULE: Failed to import eventDispatcher: ${importError.message}`);\n        }\n      }\n    } catch (diError) {\n      fastify.log.error(`❌ AI MODULE: Error accessing DI container: ${diError.message}`);\n    }\n  } else {\n    fastify.log.error('❌ AI MODULE: DI container not available');\n  }\n  \n  // Register the AI pubsub listener\n  await fastify.register(aiPubsubListener);\n  fastify.log.info(`aiPubsubListener registered: ${!!fastify.aiPubsubListener}`);\n  \n  // Check if event dispatcher is available - check both the decorator and the DI container flag\n  if (fastify.eventDispatcher) {\n    fastify.log.info('✅ AI MODULE: eventDispatcher is available as a fastify decorator');\n  } else if (eventDispatcherFound) {\n    fastify.log.info('✅ AI MODULE: eventDispatcher is available through the DI container');\n  } else if (fastify.diContainer && await fastify.diContainer.hasRegistration('eventDispatcher')) {\n    // One final check directly with the DI container\n    fastify.log.info('✅ AI MODULE: eventDispatcher is available in the DI container');\n  } else {\n    fastify.log.error('❌ AI MODULE: eventDispatcher is NOT available through any source');\n  }\n \n\n};\n\nmodule.exports.autoPrefix = '/api/ai';",
  "type": "github-file",
  "userId": "d41402df-182a-41ec-8f05-153118bf2718",
  "workerId": 0,
  "score": 0.387018204,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3_anatolyZader_vc-3_chunk_1758_1761390472217"
}
```

---

### Chunk 3/4
- **Source**: anatolyZader/vc-3
- **Type**: github-file
- **Size**: 5911 characters
- **Score**: 0.364149094
- **Repository**: anatolyZader/vc-3
- **Branch**: main
- **File Type**: N/A
- **Processed At**: 2025-10-18T13:44:30.503Z

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

}

module.exports = fp(aiController);
```

**Metadata**:
```json
{
  "branch": "main",
  "filePath": "backend/business_modules/ai/application/aiController.js",
  "fileSize": 5933,
  "loaded_at": "2025-10-18T13:44:30.503Z",
  "loading_method": "cloud_native_api",
  "priority": 90,
  "processedAt": "2025-10-18T13:44:30.503Z",
  "repoId": "anatolyZader/vc-3",
  "repository": "anatolyZader/vc-3",
  "sha": "60d4a78e00bb9c85f4d171e18077f1f0e94cfdec",
  "size": 5933,
  "source": "anatolyZader/vc-3",
  "text": "// aiController.js\n/* eslint-disable no-unused-vars */\n'use strict';\n\nconst fp = require('fastify-plugin');\n\nasync function aiController(fastify, options) {\n\n\n    fastify.decorate('respondToPrompt', async (request, reply) => {\n      try {\n        const { conversationId, prompt } = request.body;\n        const userId = request.user.id;\n        \n        fastify.log.info(`🤖 AI Controller: Processing prompt for user ${userId}, conversation ${conversationId}`);\n           // Check if diScope is available\n      if (!request.diScope) {\n        fastify.log.error('❌ AI Controller: diScope is missing in request');\n        // Fallback: create scope manually\n        request.diScope = fastify.diContainer.createScope();\n        fastify.log.info('✅ AI Controller: Created diScope manually as fallback');\n      }\n        \n        const aiService = await request.diScope.resolve('aiService');\n        if (!aiService) {\n          fastify.log.error('❌ AI Controller: Failed to resolve aiService from diScope');\n          throw new Error('aiService could not be resolved');\n        }\n        \n        // Check and set userId on adapter if needed\n        if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {\n          await aiService.aiAdapter.setUserId(userId);\n          fastify.log.debug(`🔧 AI Controller: userId set on adapter: ${userId}`);\n        }\n        \n        // Ensure persistence adapter is available for conversation history\n        if (aiService.aiAdapter && aiService.aiPersistAdapter && typeof aiService.aiAdapter.setPersistenceAdapter === 'function') {\n          aiService.aiAdapter.setPersistenceAdapter(aiService.aiPersistAdapter);\n          fastify.log.debug(`🔧 AI Controller: persistence adapter set on AI adapter for conversation history`);\n        }\n        \n        const TIMEOUT_MS = 90000; // Increased from 60s to 90s\n        fastify.log.debug(`🔧 AI Controller: Timeout set to ${TIMEOUT_MS}ms`);\n        const timeoutPromise = new Promise((_, reject) => {\n          setTimeout(() => reject(new Error('AI request processing timeout')), TIMEOUT_MS);\n        });\n\n        const responsePromise = aiService.respondToPrompt(userId, conversationId, prompt);\n        const response = await Promise.race([responsePromise, timeoutPromise]);\n        \n        return { \n          response,\n          status: 'success',\n          timestamp: new Date().toISOString()\n        };\n      } catch (error) {\n        fastify.log.error(`❌ AI Controller error:`, error);\n        if (error.stack) {\n          fastify.log.error(`❌ AI Controller error stack: ${error.stack}`);\n        }\n        throw fastify.httpErrors.internalServerError('Failed to process AI request', { cause: error });\n      }\n    });\n\n    fastify.decorate('processPushedRepo', async (request, reply) => {\n    try {\n      const { repoId, repoData} = request.body;\n      const userId = request.user.id; \n      fastify.log.info(`Processing pushed repository for user: ${userId}, repository: ${repoId}`);\n      \n      // Ensure diScope is available\n      if (!request.diScope) {\n        request.diScope = fastify.diContainer.createScope();\n        fastify.log.info('✅ Created diScope manually as fallback');\n      }\n      \n      const aiService = await request.diScope.resolve('aiService');\n      if (!aiService) {\n        throw new Error('AI service not found in DI container');\n      }\n      \n      const response = await aiService.processPushedRepo(userId, repoId, repoData);\n      \n      fastify.log.info(`pushed repo processed: ${repoId}`);\n      return response;\n    } catch (error) {\n      fastify.log.error('Error processing pushed repo:', error);\n      throw fastify.httpErrors.internalServerError('Failed to process pushed repo:', { cause: error });\n    }\n  });\n\n  fastify.decorate('manualProcessRepoDirect', async (request, reply) => {\n    try {\n      const { repoId, githubOwner, repoName, branch = 'main', repoUrl } = request.body;\n      const userId = request.user.id;\n      \n      fastify.log.info(`Manual direct repo processing requested for user: ${userId}, repository: ${repoId}`);\n      \n      // Construct repoData from the provided parameters\n      const constructedRepoData = {\n        githubOwner: githubOwner || repoId.split('/')[0],\n        repoName: repoName || repoId.split('/')[1],\n        repoUrl: repoUrl || `https://github.com/${repoId}`,\n        branch: branch,\n        description: `Manual processing of ${repoId}`,\n        timestamp: new Date().toISOString()\n      };\n      \n      // Validate constructed data\n      if (!constructedRepoData.githubOwner || !constructedRepoData.repoName) {\n        throw new Error('Invalid repoId format or missing githubOwner/repoName. Expected format: \"owner/repo-name\"');\n      }\n      \n      fastify.log.info(`Constructed repo data:`, constructedRepoData);\n      \n      // Ensure diScope is available\n      if (!request.diScope) {\n        request.diScope = fastify.diContainer.createScope();\n        fastify.log.info('✅ Created diScope manually as fallback');\n      }\n      \n      const aiService = await request.diScope.resolve('aiService');\n      if (!aiService) {\n        throw new Error('AI service not found in DI container');\n      }\n      \n      // Process the repository directly using AI service\n      const response = await aiService.processPushedRepo(userId, repoId, constructedRepoData);\n      \n      fastify.log.info(`Manual direct repo processing completed: ${repoId}`);\n      \n      return {\n        success: true,\n        message: 'Repository processed successfully via direct method',\n        repoId,\n        repoData: constructedRepoData,\n        data: response\n      };\n    } catch (error) {\n      fastify.log.error('Error in manual direct repo processing:', error);\n      throw fastify.httpErrors.internalServerError('Failed to process repository manually', { cause: error });\n    }\n  });\n\n}\n\nmodule.exports = fp(aiController);",
  "type": "github-file",
  "userId": "d41402df-182a-41ec-8f05-153118bf2718",
  "workerId": 0,
  "score": 0.364149094,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3_anatolyZader_vc-3_chunk_3325_1760795171204"
}
```

---

### Chunk 4/4
- **Source**: anatolyZader/vc-3
- **Type**: github-file
- **Size**: 6018 characters
- **Score**: 0.360170364
- **Repository**: anatolyZader/vc-3
- **Branch**: main
- **File Type**: N/A
- **Processed At**: 2025-10-25T12:10:07.031Z

**Full Content**:
```
# AI Prompt Management System

This directory contains a comprehensive prompt management system for the AI module, providing centralized, maintainable, and intelligent prompt selection.

## 📁 File Structure

```
prompts/
├── index.js              # Main exports for easy importing
├── systemPrompts.js       # Core system prompts and selection logic
├── promptConfig.js        # Configuration settings and keywords
├── promptTester.js        # Testing utilities for development
└── README.md             # This documentation
```

## 🚀 Quick Start

```javascript
// Import the prompt system
const { PromptSelector, SystemPrompts } = require('./prompts');

// Auto-select appropriate prompt
const prompt = PromptSelector.selectPrompt({
  hasRagContext: true,
  conversationCount: 3,
  question: "How do I fix this API endpoint?",
  contextSources: { apiSpec: true, code: true }
});

// Use specific prompt
const ragPrompt = SystemPrompts.ragSystem(5);
const generalPrompt = SystemPrompts.general(0);
```

## 🎯 Available Prompt Types

### 1. **RAG System** (`ragSystem`)
- **Use Case**: Questions about the user's application with available context
- **Features**: Balances application-specific and general knowledge
- **Context**: API specs, documentation, code repository

### 2. **Standard** (`standard`)
- **Use Case**: Software development questions without specific context
- **Features**: General software development assistance
- **Context**: No specific application context

### 3. **Code Analysis** (`codeAnalysis`)
- **Use Case**: Code review, debugging, optimization questions
- **Features**: Expert-level code analysis and suggestions
- **Context**: Code-focused assistance

### 4. **API Specialist** (`apiSpecialist`)
- **Use Case**: API design, endpoint, and specification questions
- **Features**: REST API best practices and patterns
- **Context**: API-focused assistance

### 5. **General** (`general`)
- **Use Case**: Non-technical questions, general knowledge
- **Features**: Broad knowledge across many topics
- **Context**: General knowledge base

### 6. **Fallback** (`fallback`)
- **Use Case**: Error situations or when other prompts fail
- **Features**: Basic assistance with limited context
- **Context**: Minimal context available

## 🤖 Auto-Selection Logic

The system intelligently selects prompts based on:

1. **Context Analysis**: Available RAG context (API specs, docs, code)
2. **Keyword Detection**: Question content analysis
3. **Conversation History**: Number of previous exchanges
4. **Source Composition**: Types of available information

### Keyword Categories

- **Application**: api, endpoint, database, function, method, class, component...
- **API**: rest, endpoint, http, swagger, openapi, json, response...
- **Code**: function, method, class, debug, error, syntax, optimize...
- **General**: what is, how does, explain, tell me about, history of...

## 🧪 Testing and Development

### Run Comprehensive Tests
```javascript
const { PromptTester } = require('./prompts');

// Run all test cases
const results = PromptTester.runTests();

// Test specific question
const result = PromptTester.testPromptSelection("Tell me about the history of Earth");
```

### Interactive Testing
```javascript
// Test with different contexts
PromptTester.interactiveTest("How do I optimize this function?", true, 2);
```

### A/B Testing
```javascript
// Compare two different configurations
PromptTester.comparePrompts(
  "What's wrong with my API?",
  { hasRagContext: true, mode: 'auto' },
  { hasRagContext: false, mode: 'api' }
);
```

## ⚙️ Configuration

### Modify Keywords
Edit `promptConfig.js` to adjust keyword detection:

```javascript
keywords: {
  application: ['api', 'endpoint', 'database', ...],
  api: ['rest', 'endpoint', 'http', ...],
  // Add your custom keywords
}
```

### Adjust Thresholds
```javascript
thresholds: {
  minContextForRag: 1,        // Minimum context sources for RAG
  minKeywordMatches: 2,       // Minimum keywords for category detection
  confidenceThreshold: 0.6    // Minimum confidence for auto-selection
}
```

### Enable Logging
```javascript
logging: {
  logPromptSelection: true,     // Log selected prompts
  logKeywordAnalysis: false,    // Log keyword matching details
  logContextAnalysis: true      // Log context source analysis
}
```

## 🔧 Manual Override

Force specific prompt types for testing:

```javascript
const prompt = PromptSelector.selectPrompt({
  question: "Any question",
  mode: 'general'  // Override: 'rag', 'standard', 'code', 'api', 'general', 'fallback'
});
```

## 📈 Benefits

1. **Maintainability**: Central prompt management
2. **Flexibility**: Easy to modify and test prompts
3. **Intelligence**: Context-aware prompt selection
4. **Consistency**: Standardized prompts across the system
5. **Testing**: Built-in testing utilities
6. **Performance**: Optimized prompts for different use cases
7. **Version Control**: Track prompt changes over time

## 🔮 Future Enhancements

- **Semantic Analysis**: Advanced question understanding
- **Dynamic Adjustment**: Prompts that adapt during conversation
- **Performance Metrics**: Track prompt effectiveness
- **Custom Prompts**: User-defined prompt templates
- **Multi-language**: Support for different languages

## Example Usage in Main Code

```javascript
// In aiLangchainAdapter.js
const { PromptSelector } = require('./prompts');

// Replace hardcoded prompts with intelligent selection
const systemPrompt = PromptSelector.selectPrompt({
  hasRagContext: similarDocuments.length > 0,
  conversationCount: conversationHistory.length,
  question: prompt,
  contextSources: {
    apiSpec: sourceAnalysis.apiSpec > 0,
    rootDocumentation: sourceAnalysis.rootDocumentation > 0,
    moduleDocumentation: sourceAnalysis.moduleDocumentation > 0,
    code: sourceAnalysis.githubRepo > 0
  },
  mode: 'auto'
});
```

This system ensures your AI provides the most appropriate responses based on context and question type, while maintaining clean, manageable code.

```

**Metadata**:
```json
{
  "branch": "main",
  "filePath": "backend/business_modules/ai/infrastructure/ai/prompts/README.md",
  "fileSize": 6068,
  "loaded_at": "2025-10-25T12:10:07.031Z",
  "loading_method": "cloud_native_api",
  "priority": 50,
  "processedAt": "2025-10-25T12:10:07.031Z",
  "repoId": "anatolyZader/vc-3",
  "repository": "anatolyZader/vc-3",
  "sha": "1e0f2c889dfc9d090291ce284f6c335016cdd3a4",
  "size": 6068,
  "source": "anatolyZader/vc-3",
  "text": "# AI Prompt Management System\n\nThis directory contains a comprehensive prompt management system for the AI module, providing centralized, maintainable, and intelligent prompt selection.\n\n## 📁 File Structure\n\n```\nprompts/\n├── index.js              # Main exports for easy importing\n├── systemPrompts.js       # Core system prompts and selection logic\n├── promptConfig.js        # Configuration settings and keywords\n├── promptTester.js        # Testing utilities for development\n└── README.md             # This documentation\n```\n\n## 🚀 Quick Start\n\n```javascript\n// Import the prompt system\nconst { PromptSelector, SystemPrompts } = require('./prompts');\n\n// Auto-select appropriate prompt\nconst prompt = PromptSelector.selectPrompt({\n  hasRagContext: true,\n  conversationCount: 3,\n  question: \"How do I fix this API endpoint?\",\n  contextSources: { apiSpec: true, code: true }\n});\n\n// Use specific prompt\nconst ragPrompt = SystemPrompts.ragSystem(5);\nconst generalPrompt = SystemPrompts.general(0);\n```\n\n## 🎯 Available Prompt Types\n\n### 1. **RAG System** (`ragSystem`)\n- **Use Case**: Questions about the user's application with available context\n- **Features**: Balances application-specific and general knowledge\n- **Context**: API specs, documentation, code repository\n\n### 2. **Standard** (`standard`)\n- **Use Case**: Software development questions without specific context\n- **Features**: General software development assistance\n- **Context**: No specific application context\n\n### 3. **Code Analysis** (`codeAnalysis`)\n- **Use Case**: Code review, debugging, optimization questions\n- **Features**: Expert-level code analysis and suggestions\n- **Context**: Code-focused assistance\n\n### 4. **API Specialist** (`apiSpecialist`)\n- **Use Case**: API design, endpoint, and specification questions\n- **Features**: REST API best practices and patterns\n- **Context**: API-focused assistance\n\n### 5. **General** (`general`)\n- **Use Case**: Non-technical questions, general knowledge\n- **Features**: Broad knowledge across many topics\n- **Context**: General knowledge base\n\n### 6. **Fallback** (`fallback`)\n- **Use Case**: Error situations or when other prompts fail\n- **Features**: Basic assistance with limited context\n- **Context**: Minimal context available\n\n## 🤖 Auto-Selection Logic\n\nThe system intelligently selects prompts based on:\n\n1. **Context Analysis**: Available RAG context (API specs, docs, code)\n2. **Keyword Detection**: Question content analysis\n3. **Conversation History**: Number of previous exchanges\n4. **Source Composition**: Types of available information\n\n### Keyword Categories\n\n- **Application**: api, endpoint, database, function, method, class, component...\n- **API**: rest, endpoint, http, swagger, openapi, json, response...\n- **Code**: function, method, class, debug, error, syntax, optimize...\n- **General**: what is, how does, explain, tell me about, history of...\n\n## 🧪 Testing and Development\n\n### Run Comprehensive Tests\n```javascript\nconst { PromptTester } = require('./prompts');\n\n// Run all test cases\nconst results = PromptTester.runTests();\n\n// Test specific question\nconst result = PromptTester.testPromptSelection(\"Tell me about the history of Earth\");\n```\n\n### Interactive Testing\n```javascript\n// Test with different contexts\nPromptTester.interactiveTest(\"How do I optimize this function?\", true, 2);\n```\n\n### A/B Testing\n```javascript\n// Compare two different configurations\nPromptTester.comparePrompts(\n  \"What's wrong with my API?\",\n  { hasRagContext: true, mode: 'auto' },\n  { hasRagContext: false, mode: 'api' }\n);\n```\n\n## ⚙️ Configuration\n\n### Modify Keywords\nEdit `promptConfig.js` to adjust keyword detection:\n\n```javascript\nkeywords: {\n  application: ['api', 'endpoint', 'database', ...],\n  api: ['rest', 'endpoint', 'http', ...],\n  // Add your custom keywords\n}\n```\n\n### Adjust Thresholds\n```javascript\nthresholds: {\n  minContextForRag: 1,        // Minimum context sources for RAG\n  minKeywordMatches: 2,       // Minimum keywords for category detection\n  confidenceThreshold: 0.6    // Minimum confidence for auto-selection\n}\n```\n\n### Enable Logging\n```javascript\nlogging: {\n  logPromptSelection: true,     // Log selected prompts\n  logKeywordAnalysis: false,    // Log keyword matching details\n  logContextAnalysis: true      // Log context source analysis\n}\n```\n\n## 🔧 Manual Override\n\nForce specific prompt types for testing:\n\n```javascript\nconst prompt = PromptSelector.selectPrompt({\n  question: \"Any question\",\n  mode: 'general'  // Override: 'rag', 'standard', 'code', 'api', 'general', 'fallback'\n});\n```\n\n## 📈 Benefits\n\n1. **Maintainability**: Central prompt management\n2. **Flexibility**: Easy to modify and test prompts\n3. **Intelligence**: Context-aware prompt selection\n4. **Consistency**: Standardized prompts across the system\n5. **Testing**: Built-in testing utilities\n6. **Performance**: Optimized prompts for different use cases\n7. **Version Control**: Track prompt changes over time\n\n## 🔮 Future Enhancements\n\n- **Semantic Analysis**: Advanced question understanding\n- **Dynamic Adjustment**: Prompts that adapt during conversation\n- **Performance Metrics**: Track prompt effectiveness\n- **Custom Prompts**: User-defined prompt templates\n- **Multi-language**: Support for different languages\n\n## Example Usage in Main Code\n\n```javascript\n// In aiLangchainAdapter.js\nconst { PromptSelector } = require('./prompts');\n\n// Replace hardcoded prompts with intelligent selection\nconst systemPrompt = PromptSelector.selectPrompt({\n  hasRagContext: similarDocuments.length > 0,\n  conversationCount: conversationHistory.length,\n  question: prompt,\n  contextSources: {\n    apiSpec: sourceAnalysis.apiSpec > 0,\n    rootDocumentation: sourceAnalysis.rootDocumentation > 0,\n    moduleDocumentation: sourceAnalysis.moduleDocumentation > 0,\n    code: sourceAnalysis.githubRepo > 0\n  },\n  mode: 'auto'\n});\n```\n\nThis system ensures your AI provides the most appropriate responses based on context and question type, while maintaining clean, manageable code.\n",
  "type": "github-file",
  "userId": "d41402df-182a-41ec-8f05-153118bf2718",
  "workerId": 0,
  "score": 0.360170364,
  "id": "d41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3_anatolyZader_vc-3_chunk_2142_1761394259087"
}
```

---


## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: 1187 characters
**Generated At**: 2025-10-25T12:23:52.060Z

### Response Content:
```markdown
Based on the provided code context, here are the key methods and their purposes in the `ai` module:

1. `aiController.js`:
   - `respondToPrompt`: This method is the main entry point for processing AI prompts. It retrieves the `aiService` from the DI container, checks if the `aiAdapter` is set, and then delegates the prompt processing to the `aiService`.

2. `ai/index.js`:
   - `aiModuleIndex`: This is the main entry point for the `ai` module. It performs the following tasks:
     - Registers the `ai` module with the Fastify application.
     - Loads and registers the application controllers located in the `ai/application` directory.
     - Registers the `aiPubsubListener` module, which listens for and processes AI-related events.
     - Checks the availability of the `eventDispatcher` service, which is used for publishing and subscribing to events.

I don't see any other specific method implementations in the provided code context. The code suggests that the `ai` module has a modular architecture, with the `aiController.js` and `aiPubsubListener.js` files handling the main AI-related functionality, but I don't have access to the actual implementation of those modules.
```

### Response Quality Assessment:
- **Relevance to Query**: MEDIUM - Partially addresses query
- **Use of Context**: MEDIUM - Implicit context usage
- **Response Completeness**: GOOD - Structured with adequate detail

### Key Response Elements:
- **Structured Lists**: 2 numbered points
- **Bullet Points**: 6 bullet items
- **File References**: 4 specific files mentioned
- **Technical Terms**: 7 technical concepts used

---


## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: 3233ms
- **Documents Retrieved**: 4
- **Unique Sources**: 1
- **Average Chunk Size**: 4611 characters

### Context Quality:
- **Relevance Score**: HIGH (4 relevant chunks found)
- **Diversity Score**: LOW (1 unique sources)
- **Completeness Score**: HIGH (18,444 total characters)

### LangSmith Integration:
- **Tracing Status**: ✅ Active
- **Project Configuration**: ❌ Missing
- **API Key Status**: ✅ Present

## 🔍 Source Analysis

### Most Frequent Sources:
- **anatolyZader/vc-3**: 4 chunks

### Repository Coverage:
- anatolyZader/vc-3

## 🎯 Query Classification & Analysis

- **Query Type**: Informational/Explanatory
- **Domain Focus**: General Application
- **Technical Complexity**: High
- **Expected Response Type**: Informational

## 🚀 Recommendations

- **Increase Source Diversity**: All chunks from same source, consider broader indexing

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates good RAG performance with:
- **Retrieval Quality**: Good
- **Context Diversity**: Medium
- **Content Richness**: Very High
- **Response Quality**: Comprehensive

The query was successfully processed with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: 2025-10-25T12:23:52.060Z  
**LangSmith Project**: eventstorm-trace  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
