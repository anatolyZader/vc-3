'use strict';

module.exports = {
  $id: 'schema:ai:process-pushed-repo',
  type: 'object',
  body: {
    type: 'object',
    required: ['repoId'],
    properties: {
      repoId: { type: 'string' },
      repoData: { 
        type: 'object',
        additionalProperties: true
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' }
      },
      additionalProperties: true
    }
  }
};