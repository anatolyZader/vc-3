// createPageSchema.js
'use strict';

module.exports = {
    $id: 'schema:wiki:create-page',
    params: {
      type: 'object',
      required: ['repoId'],
      properties: {
        repoId: {
          type: 'string',
          description: 'The ID of the repository.'
        }
      },
      additionalProperties: false
    },
    body: {
      type: 'object',
      required: ['pageTitle'],
      properties: {
        pageTitle: {
          type: 'string',
          description: 'The title of the page to create.'
        }
      },
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  }
