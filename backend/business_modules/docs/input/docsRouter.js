'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function docsRouter(fastify, opts) {
  console.log('docsRouter is loaded!');

  // Route to fetch a whole docs
  fastify.route({
    method: 'GET',
    url: '/repos/:repoId/docs',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchDocs,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 }
        },
        required: ['repoId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            repoId: { type: 'string' },
            pages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  pageId: { type: 'string' },
                  title: { type: 'string' },
                  updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['pageId', 'title', 'updatedAt'],
                additionalProperties: true
              }
            }
          },
          required: ['repoId', 'pages'],
          additionalProperties: true
        }
      }
    }
  });

  // Route to create a new docs page
  fastify.route({
    method: 'POST',
    url: '/repos/:repoId/pages/create',
    preValidation: [fastify.verifyToken],
    handler: fastify.createPage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 }
        },
        required: ['repoId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          pageTitle: { type: 'string', minLength: 1 }
        },
        required: ['pageTitle'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to fetch a specific docs page
  fastify.route({
    method: 'GET',
    url: '/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchPage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 },
          pageId: { type: 'string', minLength: 1 }
        },
        required: ['repoId', 'pageId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['pageId', 'title', 'content', 'updatedAt'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to update docs page content
  fastify.route({
    method: 'PUT',
    url: '/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.updatePage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 },
          pageId: { type: 'string', minLength: 1 }
        },
        required: ['repoId', 'pageId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          newContent: { type: 'string', minLength: 1 }
        },
        required: ['newContent'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to delete a docs page
  fastify.route({
    method: 'DELETE',
    url: '/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.deletePage,
    schema: {
      tags: ['docs'],
      params: {
        type: 'object',
        properties: {
          repoId: { type: 'string', minLength: 1 },
          pageId: { type: 'string', minLength: 1 }
        },
        required: ['repoId', 'pageId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // Route to trigger docs files update
  fastify.route({
    method: 'POST',
    url: '/update-files',
    preValidation: [fastify.verifyToken],
    handler: fastify.updateDocsFiles,
    schema: {
      tags: ['docs'],
      description: 'Triggers an AI-based process to analyze all business modules and generate/update markdown documentation files for each.',
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });
});