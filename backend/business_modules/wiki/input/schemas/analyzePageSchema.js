// analyzePageSchema.js
'use strict';

module.exports = {
  $id: 'schema:wiki:analyze-page',
  type: 'object', // Added explicit type
  params: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: {
        type: 'string',
        format: 'uuid',
      }
    },
    additionalProperties: false
  },
  // Added missing response schema
  response: {
    202: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Page analysis scheduled' },
        analysisId: { type: 'string', format: 'uuid' }
      }
    },
    404: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [404] },
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string', example: 'Page not found' }
      }
    }
  }
};