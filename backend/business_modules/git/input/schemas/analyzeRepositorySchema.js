// analyzeRepoSchema.js
'use strict';

module.exports = {
  $id: 'schema:git:analyze-repository',
  type: 'object',  // Added explicit type
  params: {
    type: 'object',
    required: ['repoId'],
    properties: {
      repoId: {
        type: 'string',
        format: 'uuid',
      }
    },
    additionalProperties: false
  },
  response: {  // Added response schema
    202: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        analysisId: { type: 'string' }
      }
    }
  }
};