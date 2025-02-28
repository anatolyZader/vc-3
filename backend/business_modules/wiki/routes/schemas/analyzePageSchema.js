// analyzePageSchema.js
'use strict';

module.exports = {
  $id: 'schema:wiki:analyze-page',
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
  }
};
