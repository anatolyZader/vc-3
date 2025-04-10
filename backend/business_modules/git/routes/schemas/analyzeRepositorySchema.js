// analyzeRepoSchema.js
'use strict';

module.exports = {
  $id: 'schema:git:analyze-repository',
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
  }
};
