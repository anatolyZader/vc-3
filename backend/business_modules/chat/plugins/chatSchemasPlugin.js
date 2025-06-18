/* eslint-disable no-unused-vars */
// chatSchemasPlugin.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function chatSchemasPlugin(fastify, opts) {
  console.log('chatSchemasPlugin loaded!');

  const schemas = [

    { id: 'schema:chat:start-conversation', path: '../routes/schemas/startConversationSchema.js' },
    { id: 'schema:chat:fetch-conversations-history', path: '../routes/schemas/fetchConversationsHistorySchema.js' },
    { id: 'schema:chat:fetch-conversation', path: '../routes/schemas/fetchConversationSchema.js' },
    { id: 'schema:chat:rename-conversation', path: '../routes/schemas/renameConversationSchema.js' },
    { id: 'schema:chat:delete-conversation', path: '../routes/schemas/deleteConversationSchema.js' },
    { id: 'schema:chat:add-question', path: '../routes/schemas/addQuestionSchema.js' },
    { id: 'schema:chat:add-answer', path: '../routes/schemas/addAnswerSchema.js' },

  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      try {
        fastify.addSchema(require(path));
      } catch (error) {
        fastify.log.error(`Error loading schema "${id}" from path "${path}":`, error); 
        throw fastify.httpErrors.internalServerError(
          `Failed to load schema "${id}" from path "${path}"`,
          { cause: error } 
        );
      }
    }
  });
});
