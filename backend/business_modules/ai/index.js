// ai/index.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('path');
const autoload = require('@fastify/autoload');
const aiPubsubListener = require('./input/aiPubsubListener');

module.exports = async function aiModuleIndex(fastify, opts) {
  fastify.log.info('✅ ai/index.js was registered');

  const allFiles = fs.readdirSync(__dirname);
  fastify.log.info(`Files in ai_module: ${JSON.stringify(allFiles)}`);
  
  // Load application controllers
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'application'),
    encapsulate: false,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Controller'),
    dirNameRoutePrefix: false
  });

  await fastify.register(autoload, {
    dir: path.join(__dirname, 'input'),
    encapsulate: true,
    maxDepth: 1,
    matchFilter: (filepath) => filepath.includes('Router'),
    dirNameRoutePrefix: false,
    prefix: ''
  });

  // First, let's ensure eventDispatcher is available by checking the DI container
  let eventDispatcherFound = false;
  
  if (fastify.diContainer) {
    try {
      // Log all registrations in debug mode to help troubleshoot
      try {
        const allRegistrations = await fastify.diContainer.listRegistrations();
        fastify.log.debug(`🔍 AI MODULE: DI container has the following registrations: ${JSON.stringify(allRegistrations)}`);
      } catch (listError) {
        fastify.log.debug(`⚠️ AI MODULE: Could not list DI registrations: ${listError.message}`);
      }

      if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
        const eventDispatcher = await fastify.diContainer.resolve('eventDispatcher');
        // Make sure we don't overwrite an existing decorator
        if (!fastify.hasDecorator('eventDispatcher')) {
          fastify.decorate('eventDispatcher', eventDispatcher);
          fastify.log.info('✅ AI MODULE: eventDispatcher found in DI container and registered as decorator');
        } else {
          fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists, not overwriting');
        }
        eventDispatcherFound = true;
      } else {
        fastify.log.warn('⚠️ AI MODULE: eventDispatcher not found in DI container, trying direct import');
        
        // Try to import directly from eventDispatcher.js
        try {
          const { eventDispatcher } = require('../../eventDispatcher');
          if (eventDispatcher) {
            if (!fastify.hasDecorator('eventDispatcher')) {
              fastify.decorate('eventDispatcher', eventDispatcher);
              fastify.log.info('✅ AI MODULE: eventDispatcher imported directly and registered as decorator');
            } else {
              fastify.log.info('✅ AI MODULE: eventDispatcher decorator already exists (from direct import)');
            }
            eventDispatcherFound = true;
          }
        } catch (importError) {
          fastify.log.error(`❌ AI MODULE: Failed to import eventDispatcher: ${importError.message}`);
        }
      }
    } catch (diError) {
      fastify.log.error(`❌ AI MODULE: Error accessing DI container: ${diError.message}`);
    }
  } else {
    fastify.log.error('❌ AI MODULE: DI container not available');
  }
  
  // Register the AI pubsub listener
  await fastify.register(aiPubsubListener);
  fastify.log.info(`aiPubsubListener registered: ${!!fastify.aiPubsubListener}`);
  
  // Check if event dispatcher is available - check both the decorator and the DI container flag
  if (fastify.eventDispatcher) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available as a fastify decorator');
  } else if (eventDispatcherFound) {
    fastify.log.info('✅ AI MODULE: eventDispatcher is available through the DI container');
  } else if (fastify.diContainer && await fastify.diContainer.hasRegistration('eventDispatcher')) {
    // One final check directly with the DI container
    fastify.log.info('✅ AI MODULE: eventDispatcher is available in the DI container');
  } else {
    fastify.log.error('❌ AI MODULE: eventDispatcher is NOT available through any source');
  }
 

};

module.exports.autoPrefix = '/api/ai';