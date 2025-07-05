'use strict';

module.exports = {
    $id: 'schema:wiki:delete-page',
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
          message: { type: 'string' }
        },
        additionalProperties: false
      }
    }
}