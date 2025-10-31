# AST Splitter Analysis: aiController.js

**Generated:** 2025-10-14T11:25:45.205Z  
**Source File:** `./backend/business_modules/ai/application/aiController.js`  
**Original Size:** 5911 characters  
**Total Chunks:** 6  

## Overview

This document shows the enhanced AST splitter results for `aiController.js`, demonstrating:
- Fastify route/handler detection
- Event subscription detection  
- Semantic unit boundaries
- Clean code generation (comments removed)

---

## Chunk 1

**Splitting Method:** `residual`  
**Token Count:** 14  
**Unit Count:** undefined  
**SHA1:** `undefined`  

### Code Content

```javascript
'use strict';

const fp = require('fastify-plugin');
```

---

## Chunk 2

**Splitting Method:** `residual`  
**Token Count:** 13  
**Unit Count:** undefined  
**SHA1:** `undefined`  

### Code Content

```javascript
async function aiController(fastify, options) {
```

---

## Chunk 3

**Splitting Method:** `ast_semantic`  
**Token Count:** 441  
**Unit Count:** undefined  
**SHA1:** `undefined`  

### Code Content

```javascript
fastify.decorate('respondToPrompt', async (request, reply) => {
    try {
      const {
        conversationId,
        prompt
      } = request.body;
      const userId = request.user.id;
      if (!request.diScope) {
        fastify.log.error('❌ AI Controller: diScope is missing in request');
        request.diScope = fastify.diContainer.createScope();
      }
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        fastify.log.error('❌ AI Controller: Failed to resolve aiService from diScope');
        throw new Error('aiService could not be resolved');
      }
      if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
        await aiService.aiAdapter.setUserId(userId);
      }
      if (aiService.aiAdapter && aiService.aiPersistAdapter && typeof aiService.aiAdapter.setPersistenceAdapter === 'function') {
        aiService.aiAdapter.setPersistenceAdapter(aiService.aiPersistAdapter);
      }
      const TIMEOUT_MS = 90000;
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
      throw fastify.httpErrors.internalServerError('Failed to process AI request', {
        cause: error
      });
    }
  })
```

---

## Chunk 4

**Splitting Method:** `ast_semantic`  
**Token Count:** 193  
**Unit Count:** undefined  
**SHA1:** `undefined`  

### Code Content

```javascript
fastify.decorate('processPushedRepo', async (request, reply) => {
    try {
      const {
        repoId,
        repoData
      } = request.body;
      const userId = request.user.id;
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
      }
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      const response = await aiService.processPushedRepo(userId, repoId, repoData);
      return response;
    } catch (error) {
      fastify.log.error('Error processing pushed repo:', error);
      throw fastify.httpErrors.internalServerError('Failed to process pushed repo:', {
        cause: error
      });
    }
  })
```

---

## Chunk 5

**Splitting Method:** `ast_semantic`  
**Token Count:** 397  
**Unit Count:** undefined  
**SHA1:** `undefined`  

### Code Content

```javascript
fastify.decorate('manualProcessRepoDirect', async (request, reply) => {
    try {
      const {
        repoId,
        githubOwner,
        repoName,
        branch = 'main',
        repoUrl
      } = request.body;
      const userId = request.user.id;
      const constructedRepoData = {
        githubOwner: githubOwner || repoId.split('/')[0],
        repoName: repoName || repoId.split('/')[1],
        repoUrl: repoUrl || `https://github.com/${repoId}`,
        branch: branch,
        description: `Manual processing of ${repoId}`,
        timestamp: new Date().toISOString()
      };
      if (!constructedRepoData.githubOwner || !constructedRepoData.repoName) {
        throw new Error('Invalid repoId format or missing githubOwner/repoName. Expected format: "owner/repo-name"');
      }
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
      }
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      const response = await aiService.processPushedRepo(userId, repoId, constructedRepoData);
      return {
        success: true,
        message: 'Repository processed successfully via direct method',
        repoId,
        repoData: constructedRepoData,
        data: response
      };
    } catch (error) {
      fastify.log.error('Error in manual direct repo processing:', error);
      throw fastify.httpErrors.internalServerError('Failed to process repository manually', {
        cause: error
      });
    }
  })
```

---

## Chunk 6

**Splitting Method:** `residual`  
**Token Count:** 9  
**Unit Count:** undefined  
**SHA1:** `undefined`  

### Code Content

```javascript
module.exports = fp(aiController);
```

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Chunks | 6 |
| Total Tokens | 1067 |
| Average Tokens per Chunk | 178 |
| Min Tokens | 9 |
| Max Tokens | 441 |
| Original File Tokens | 1478 |

## Chunk Distribution by Type

- **no_units**: 6 chunks
