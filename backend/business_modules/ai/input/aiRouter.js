// aiRouter.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function aiRouter(fastify, opts) {
  console.log('aiRouter is loaded!');

  fastify.route({
    method: 'POST',
    url: '/respond',
    preValidation: [fastify.verifyToken],
    handler: fastify.respondToPrompt,
    schema: {
      tags: ['ai'],
      body: {
        type: 'object',
        required: ['conversationId', 'prompt'],
        properties: {
          conversationId: { type: 'string', minLength: 1 },
          prompt: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            response: { type: 'string' }, // or object/array depending on actual response shape!
            status: { type: 'string', enum: ['success', 'failure'] },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['response', 'status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  });
  
  fastify.route({
    method: 'POST',
    url: '/process-pushed-repo',
    preValidation: [fastify.verifyToken],
    handler: fastify.processPushedRepo,
    schema: {
      tags: ['ai'],
      body: {
        type: 'object',
        required: ['repoId', 'repoData'],
        properties: {
          repoId: { type: 'string', minLength: 1 },
          repoData: { type: 'object' } // If you can specify the shape, do so!
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object', // Adjust shape to match what you actually return!
          properties: {
            result: { type: 'string' }, // or whatever your response shape is
            details: { type: 'object' }
          },
          additionalProperties: true // or false if you want strict checking
        }
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: '/manual-process-repo-direct',
    preValidation: [fastify.verifyToken],
    handler: fastify.manualProcessRepoDirect,
    schema: {
      tags: ['ai'],
      summary: 'Manually process a repository directly for RAG indexing',
      description: 'Directly trigger repository processing for vector embedding storage without external GitHub API calls',
      body: {
        type: 'object',
        required: ['repoId'],
        properties: {
          repoId: { 
            type: 'string', 
            minLength: 1,
            description: 'Repository identifier (e.g., "owner/repo-name")'
          },
          githubOwner: { 
            type: 'string',
            description: 'GitHub repository owner/organization name (optional, will be extracted from repoId if not provided)'
          },
          repoName: { 
            type: 'string',
            description: 'GitHub repository name (optional, will be extracted from repoId if not provided)'
          },
          branch: { 
            type: 'string', 
            default: 'main',
            description: 'Repository branch to process (defaults to "main")'
          },
          repoUrl: { 
            type: 'string',
            description: 'Full repository URL (optional, will be constructed if not provided)'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            repoId: { type: 'string' },
            repoData: {
              type: 'object',
              properties: {
                githubOwner: { type: 'string' },
                repoName: { type: 'string' },
                repoUrl: { type: 'string' },
                branch: { type: 'string' },
                description: { type: 'string' },
                timestamp: { type: 'string' }
              },
              additionalProperties: false
            },
            data: { 
              type: 'object',
              additionalProperties: true
            }
          },
          additionalProperties: false
        }
      }
    }
  });

});