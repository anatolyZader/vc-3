// fetchPageSchema.js
'use strict';

module.exports = {
    $id: 'schema:wiki:fetch-page',
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
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          page: { type: 'object' }
        },
        additionalProperties: false
      }
    }
  }