'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function gitRouter(fastify, opts) {
  console.log('gitRouter is loaded!');

  // fetch repository
  fastify.route({
    method: 'GET',
    url: '/repositories/:owner/:repo',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchRepo,
    schema: {
      tags: ['git'],
      params: {
        type: 'object',
        properties: {
          owner: { type: 'string', minLength: 1 },
          repo: { type: 'string', minLength: 1 }
        },
        required: ['owner', 'repo'],
        additionalProperties: false
      },
      headers: {
        type: 'object',
        properties: {
          'x-correlation-id': { type: 'string' }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            fullName: { type: 'string' },
            owner: { type: 'string' },
            private: { type: 'boolean' },
            description: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            // Add or adjust more fields as your repo object provides
          },
          additionalProperties: true
        }
      }
    }
  });

  // persist repository
  fastify.route({
    method: 'POST',
    url: '/repositories/:owner/:repo/persist',
    preValidation: [fastify.verifyToken],
    handler: fastify.persistRepo,
    schema: {
      tags: ['git'],
      params: {
        type: 'object',
        properties: {
          owner: { type: 'string', minLength: 1 },
          repo: { type: 'string', minLength: 1 }
        },
        required: ['owner', 'repo'],
        additionalProperties: false
      },
      headers: {
        type: 'object',
        properties: {
          'x-correlation-id': { type: 'string' }
        },
        additionalProperties: true
      },
      body: {
        type: 'object',
        properties: {
          branch: { type: 'string', default: 'main' },
          forceUpdate: { type: 'boolean', default: false },
          includeHistory: { type: 'boolean', default: true }
        },
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            repositoryId: { type: 'string' },
            owner: { type: 'string' },
            repo: { type: 'string' },
            branch: { type: 'string' },
            persistedAt: { type: 'string', format: 'date-time' },
            filesProcessed: { type: 'number' },
            message: { type: 'string' }
          },
          additionalProperties: true
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  });

});