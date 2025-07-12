// updatePageSchema.js
'use strict';

module.exports = {
    $id: 'schema:wiki:update-page',
    type: 'object', // Added explicit type
    params: {
      type: 'object',
      required: ['repoId', 'pageId'],
      properties: {
        repoId: {
          type: 'string',
          description: 'The ID of the repository.'
        },
        pageId: {
          type: 'string',
          description: 'The ID of the wiki page.'
        }
      },
      additionalProperties: false
    },
    body: {
      type: 'object',
      required: ['newContent'],
      properties: {
        newContent: {
          type: 'string',
          description: 'The new content for the wiki page.'
        }
      },
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  }