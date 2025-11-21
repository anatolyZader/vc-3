/* eslint-disable no-unused-vars */
// chatSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function chatSchemasPlugin(fastify, opts) {
  console.log('chatSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:chat:start-conversation', path: '../input/schemas/startConversationSchema.js' },
    { id: 'schema:chat:fetch-conversations-history', path: '../input/schemas/fetchConversationsHistorySchema.js' },
    { id: 'schema:chat:fetch-conversation', path: '../input/schemas/fetchConversationSchema.js' },
    { id: 'schema:chat:add-question', path: '../input/schemas/addQuestionSchema.js' },
    { id: 'schema:chat:add-answer', path: '../input/schemas/addAnswerSchema.js' },
    { id: 'schema:chat:rename-conversation', path: '../input/schemas/renameConversationSchema.js' },
    { id: 'schema:chat:delete-conversation', path: '../input/schemas/deleteConversationSchema.js' },
  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      try {
        const schema = require(path);
        
        // Debug to help identify the issue
        if (schema.$id !== id) {
          fastify.log.warn(`Schema ID mismatch: Expected "${id}", but schema has "${schema.$id}"`);
          // Fix the mismatch by updating the schema's $id to match what the router expects
          schema.$id = id;
        }
        
        // Ensure type is set
        if (!schema.type) {
          schema.type = 'object';
          fastify.log.warn(`Schema missing type: Added "type": "object" to ${id}`);
        }
        
        fastify.addSchema(schema);
      } catch (error) {
        fastify.log.error(`Error loading schema "${id}" from path "${path}":`, error);
        throw fastify.httpErrors.internalServerError(
          `Failed to load schema "${id}" from path "${path}"`,
          { cause: error }
        );
      }
    }
  });
  console.log('CHAT Module - Registered Schemas:', 
  schemas.map(s => s.id).filter(id => fastify.getSchema(id) !== undefined)
);
});