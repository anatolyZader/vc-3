'use strict';

module.exports = {
  $id: 'schema:wiki:fetch-page',
  params: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of the wiki page being fetched.'
      }
    },
    additionalProperties: false
  }
};
