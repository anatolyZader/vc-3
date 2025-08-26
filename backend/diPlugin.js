// diPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { asClass, asValue, Lifetime } = require('awilix');

const infraConfig = require('./infraConfig.json');

const UserService = require('./aop_modules/auth/application/services/userService');
const AuthPostgresAdapter = require('./aop_modules/auth/infrastructure/persistence/authPostgresAdapter');

const ChatService = require('./business_modules/chat/application/services/chatService');
const ChatPostgresAdapter = require('./business_modules/chat/infrastructure/persistence/chatPostgresAdapter');
const ChatPubsubAdapter = require('./business_modules/chat/infrastructure/messaging/pubsub/chatPubsubAdapter');
const ChatAiAdapter = require('./business_modules/chat/infrastructure/ai/chatAiAdapter');
const ChatGCPVoiceAdapter = require('./business_modules/chat/infrastructure/voice/chatGCPVoiceAdapter');

const GitService = require('./business_modules/git/application/services/gitService');
const GitPostgresAdapter = require('./business_modules/git/infrastructure/persistence/gitPostgresAdapter');
const GitGithubAdapter = require('./business_modules/git/infrastructure/git/gitGithubAdapter');
const GitPubsubAdapter = require('./business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter');

const DocsService = require('./business_modules/docs/application/services/docsService');
const DocsPostgresAdapter = require('./business_modules/docs/infrastructure/persistence/docsPostgresAdapter');
const DocsPubsubAdapter = require('./business_modules/docs/infrastructure/messaging/pubsub/docsPubsubAdapter');
const DocsLangchainAdapter = require('./business_modules/docs/infrastructure/ai/docsLangchainAdapter');
const DocsGithubAdapter = require('./business_modules/docs/infrastructure/git/docsGithubAdapter');

const ApiService = require('./business_modules/api/application/services/apiService');
const ApiPostgresAdapter = require('./business_modules/api/infrastructure/persistence/apiPostgresAdapter');
const ApiPubsubAdapter = require('./business_modules/api/infrastructure/messaging/pubsub/apiPubsubAdapter');
const ApiSwaggerAdapter = require('./business_modules/api/infrastructure/api/apiSwaggerAdapter');

const AIService = require('./business_modules/ai/application/services/aiService');
const AIPostgresAdapter = require('./business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
const AIPubsubAdapter = require('./business_modules/ai/infrastructure/messaging/pubsub/aiPubsubAdapter');
const AIGithubAdapter = require('./business_modules/ai/infrastructure/git/aiGithubAdapter');
const AIGithubDocsAdapter = require('./business_modules/ai/infrastructure/docs/aiGithubDocsAdapter');

const { PubSub } = require('@google-cloud/pubsub');
const eventDispatcher = require('./eventDispatcher');
const { Connector } = require('@google-cloud/cloud-sql-connector');

module.exports = fp(async function (fastify, opts) {
  fastify.log.info('🔧 Starting DI plugin initialization...');
  
  try {
    fastify.log.info('📦 Registering fastifyAwilixPlugin...');
    await fastify.register(fastifyAwilixPlugin, {
      disposeOnClose: true, // dispose (clean up, release resources, close DB connections, etc.,) the Awilix DI container when the Fastify server is closed. 
      disposeOnResponse: true, // dispose the DI container after each response. prevents memory leaks by ensuring per-request dependencies are cleaned up after use.
      strictBooleanEnforced: true, // only a real boolean value (true/false) will be accepted,
      injectionMode: 'PROXY',
      // 'PROXY' mode uses JavaScript proxies to resolve dependencies lazily and automatically, allowing for easier property injection and circular dependency support.
      // 'CLASSIC' mode requires dependencies to be explicitly declared in constructor signatures constructors/functions (requires explicit argument lists, object destructuring is common)..
      encapsulate: false, // Awilix container - global across your Fastify app,
    });
    fastify.log.info('✅ fastifyAwilixPlugin registered successfully');
  } catch (error) {
    fastify.log.error(`❌ Failed to register fastifyAwilixPlugin: ${error.message}`); 
    fastify.log.error('Error stack:', error.stack);
    throw fastify.httpErrors.internalServerError(
      'Failed to register fastifyAwilixPlugin',
      { cause: error } 
    );
  }

  // Debug: Check if diContainer is available
  fastify.log.info('🔍 Checking diContainer availability...');
  if (!fastify.diContainer) {
    fastify.log.error('❌ diContainer is not available after plugin registration');
    throw new Error('diContainer is not available');
  }
  fastify.log.info('✅ diContainer is available');

  // // Debug: Log infraConfig structure
  // fastify.log.info('📋 InfraConfig structure:');
  // fastify.log.info('AOP modules:', JSON.stringify(infraConfig.aop_modules, null, 2));
  // fastify.log.info('Business modules:', JSON.stringify(infraConfig.business_modules, null, 2));

  // STEP 1: Register basic dependencies FIRST
  fastify.log.info('🔗 Initializing Cloud SQL Connector...');
  const cloudSqlConnector = new Connector(); 
  try {
    await fastify.diContainer.register({
      cloudSqlConnector: asValue(cloudSqlConnector)
    });
    fastify.log.info('✅ Cloud SQL Connector initialized and registered in DI container.');
  } catch (error) {
    fastify.log.error('❌ Failed to register Cloud SQL Connector:', error.message);
    throw error;
  }

  fastify.log.info('🔗 Initializing Pub/Sub Client...');
  const pubSubClient = new PubSub(); 
  try {
    await fastify.diContainer.register({
      pubSubClient: asValue(pubSubClient)
    });
    fastify.log.info('✅ Pub/Sub Client initialized and registered in DI container.');
  } catch (error) {
    fastify.log.error('❌ Failed to register Pub/Sub Client:', error.message);
    throw error;
  }

  try {
    // Debug the eventDispatcher before registration
    console.log('🔧 EventDispatcher before registration:', {
      hasEventDispatcher: !!fastify.eventDispatcher,
      eventDispatcherType: typeof fastify.eventDispatcher,
      eventDispatcherValue: fastify.eventDispatcher
    });

    await fastify.diContainer.register({
      eventDispatcher: asValue(eventDispatcher)
    });
       
    fastify.log.info('✅ EventDispatcher registered in DI container.');
  } catch (error) {
    fastify.log.error('❌ Failed to register EventDispatcher:', error.message);
    throw error;
  }

    //   // Debug after registration
    // const resolvedEventDispatcher = fastify.diContainer.resolve('eventDispatcher');
    // console.log('🔧 EventDispatcher after registration:', {
    //   hasResolved: !!resolvedEventDispatcher,
    //   resolvedType: typeof resolvedEventDispatcher,
    //   resolvedValue: resolvedEventDispatcher
    // });

  // STEP 2: NOW build adapters map AFTER dependencies are registered
  fastify.log.info('🏗️ Building adapters map...');
  const adapters = {
    authPostgresAdapter: asClass(AuthPostgresAdapter).singleton(),
    chatPostgresAdapter: asClass(ChatPostgresAdapter).scoped(),
    chatPubsubAdapter: asClass(ChatPubsubAdapter).scoped(),
    chatAiAdapter: asClass(ChatAiAdapter),
    chatGCPVoiceAdapter: asClass(ChatGCPVoiceAdapter).scoped(),
    apiSwaggerAdapter: asClass(ApiSwaggerAdapter).scoped(),
    apiPostgresAdapter: asClass(ApiPostgresAdapter).scoped(),
    apiPubsubAdapter: asClass(ApiPubsubAdapter).scoped(),
    gitGithubAdapter: asClass(GitGithubAdapter).scoped(),
    gitPubsubAdapter: asClass(GitPubsubAdapter).scoped(),
    gitPostgresAdapter: asClass(GitPostgresAdapter).scoped(),
    aiPostgresAdapter: asClass(AIPostgresAdapter).scoped(),
    aiLangchainAdapter: asClass(AILangchainAdapter, {
      injector: (container) => ({
        aiProvider: container.resolve('aiProvider'),
        aiPersistAdapter: container.resolve('aiPersistAdapter')
      })
    }).scoped(),
    aiPubsubAdapter: asClass(AIPubsubAdapter).scoped(),
    aiGithubAdapter: asClass(AIGithubAdapter).scoped(),
    aiGithubDocsAdapter: asClass(AIGithubDocsAdapter).scoped(),
    docsPubsubAdapter: asClass(DocsPubsubAdapter).scoped(),
    docsPostgresAdapter: asClass(DocsPostgresAdapter).scoped(),
    docsLangchainAdapter: asClass(DocsLangchainAdapter).scoped(),
    docsGithubAdapter: asClass(DocsGithubAdapter).scoped(),
  };

  // Debug: Validate adapters
  // fastify.log.info('🔍 Validating adapters...');
  // Object.entries(adapters).forEach(([key, adapter]) => {
  //   if (!adapter) {
  //     fastify.log.error(`❌ Adapter '${key}' is undefined`);
  //   } else {
  //     fastify.log.debug(`✅ Adapter '${key}' is valid:`, {
  //       name: adapter.name,
  //       lifetime: adapter.lifetime,
  //       type: typeof adapter
  //     });
  //   }
  // });

  // Debug: Log adapter keys
  // fastify.log.info('Available adapter keys:', Object.keys(adapters));

  // Debug: Validate config-based adapter mappings
  fastify.log.info('🔍 Validating config-based adapter mappings...');
  
  const configMappings = [
    { key: 'authPersistAdapter', config: infraConfig.aop_modules.auth.authPersistAdapter },
    { key: 'docsMessagingAdapter', config: infraConfig.business_modules.docs.docsMessagingAdapter },
    { key: 'docsPersistAdapter', config: infraConfig.business_modules.docs.docsPersistAdapter },
    { key: 'docsAiAdapter', config: infraConfig.business_modules.docs.docsAiAdapter },
    { key: 'docsGitAdapter', config: infraConfig.business_modules.docs.docsGitAdapter },
    { key: 'chatPersistAdapter', config: infraConfig.business_modules.chat.chatPersistAdapter },
    { key: 'chatMessagingAdapter', config: infraConfig.business_modules.chat.chatMessagingAdapter },
    { key: 'chatAiAdapter', config: infraConfig.business_modules.chat.chatAiAdapter || infraConfig.business_modules.chat.chatAIAdapter },
    { key: 'chatVoiceAdapter', config: infraConfig.business_modules.chat.chatVoiceAdapter },
    { key: 'gitPersistAdapter', config: infraConfig.business_modules.git.gitPersistAdapter },
    { key: 'gitAdapter', config: infraConfig.business_modules.git.gitAdapter },
    { key: 'gitMessagingAdapter', config: infraConfig.business_modules.git.gitMessagingAdapter },
    { key: 'aiAdapter', config: infraConfig.business_modules.ai.aiAdapter },
    { key: 'aiPersistAdapter', config: infraConfig.business_modules.ai.aiPersistAdapter },
    { key: 'aiMessagingAdapter', config: infraConfig.business_modules.ai.aiMessagingAdapter },
    { key: 'aiGitAdapter', config: infraConfig.business_modules.ai.aiGitAdapter },
    { key: 'aiDocsAdapter', config: infraConfig.business_modules.ai.aiDocsAdapter },
    { key: 'apiPersistAdapter', config: infraConfig.business_modules.api.apiPersistAdapter },
    { key: 'apiMessagingAdapter', config: infraConfig.business_modules.api.apiMessagingAdapter },
    { key: 'apiAdapter', config: infraConfig.business_modules.api.apiAdapter }
  ];

  configMappings.forEach(({ key, config }) => {
    if (!config) {
      fastify.log.error(`❌ Config mapping '${key}' has undefined config value`);
    } else if (!adapters[config]) {
      fastify.log.error(`❌ Config mapping '${key}' -> '${config}' not found in adapters`);
      fastify.log.error(`Available adapters: ${Object.keys(adapters).join(', ')}`);
    } else {
      fastify.log.debug(`✅ Config mapping '${key}' -> '${config}' is valid`);
    }
  });

  // STEP 3: Build service registrations
  // fastify.log.info('📦 Building service registrations...');
  
  // Build the registration object step by step for better debugging
  const serviceRegistrations = {

    // Services
    chatService: asClass(ChatService, { lifetime: Lifetime.scoped }),
    gitService: asClass(GitService, { lifetime: Lifetime.scoped }),
    docsService: asClass(DocsService, { lifetime: Lifetime.scoped }),
    aiService: asClass(AIService, { lifetime: Lifetime.scoped }),
    apiService: asClass(ApiService, { lifetime: Lifetime.scoped }),
    userService: asClass(UserService, { lifetime: Lifetime.SINGLETON }),
    
    // Add aiProvider from infraConfig
    aiProvider: asValue(infraConfig.business_modules.ai.aiProvider || 'anthropic'),
  };

  // Add config-based adapters
  try {
    serviceRegistrations.authPersistAdapter = adapters[infraConfig.aop_modules.auth.authPersistAdapter];
    serviceRegistrations.docsMessagingAdapter = adapters[infraConfig.business_modules.docs.docsMessagingAdapter];
    serviceRegistrations.docsPersistAdapter = adapters[infraConfig.business_modules.docs.docsPersistAdapter];
    serviceRegistrations.docsAiAdapter = adapters[infraConfig.business_modules.docs.docsAiAdapter];
    serviceRegistrations.chatPersistAdapter = adapters[infraConfig.business_modules.chat.chatPersistAdapter];
    serviceRegistrations.chatMessagingAdapter = adapters[infraConfig.business_modules.chat.chatMessagingAdapter];
    serviceRegistrations.chatAiAdapter = adapters[infraConfig.business_modules.chat.chatAiAdapter || infraConfig.business_modules.chat.chatAIAdapter];
    serviceRegistrations.chatVoiceAdapter = adapters[infraConfig.business_modules.chat.chatVoiceAdapter];
    serviceRegistrations.gitPersistAdapter = adapters[infraConfig.business_modules.git.gitPersistAdapter];
    serviceRegistrations.gitAdapter = adapters[infraConfig.business_modules.git.gitAdapter];
    serviceRegistrations.docsGitAdapter = adapters[infraConfig.business_modules.git.gitAdapter];
    serviceRegistrations.gitMessagingAdapter = adapters[infraConfig.business_modules.git.gitMessagingAdapter];
    serviceRegistrations.aiAdapter = adapters[infraConfig.business_modules.ai.aiAdapter];
    serviceRegistrations.aiPersistAdapter = adapters[infraConfig.business_modules.ai.aiPersistAdapter];
    serviceRegistrations.aiMessagingAdapter = adapters[infraConfig.business_modules.ai.aiMessagingAdapter];
    serviceRegistrations.aiGitAdapter = adapters[infraConfig.business_modules.ai.aiGitAdapter];
    serviceRegistrations.aiDocsAdapter = adapters[infraConfig.business_modules.ai.aiDocsAdapter];
    serviceRegistrations.apiPersistAdapter = adapters[infraConfig.business_modules.api.apiPersistAdapter];
    serviceRegistrations.apiMessagingAdapter = adapters[infraConfig.business_modules.api.apiMessagingAdapter];
    serviceRegistrations.apiAdapter = adapters[infraConfig.business_modules.api.apiAdapter];
  } catch (error) {
    fastify.log.error('❌ Error building service registrations:', error.message);
    throw error;
  }

  // Debug: Validate all service registrations
  fastify.log.info('🔍 Validating service registrations...');
  const invalidRegistrations = [];
  
  Object.entries(serviceRegistrations).forEach(([key, registration]) => {
    if (!registration || registration === undefined) {
      invalidRegistrations.push(key);
      fastify.log.error(`❌ Service registration '${key}' is undefined`);
    } else {
      fastify.log.debug(`✅ Service registration '${key}' is valid:`, {
        name: registration.name,
        lifetime: registration.lifetime,
        type: typeof registration
      });
    }
  });

  if (invalidRegistrations.length > 0) {
    fastify.log.error(`❌ Found ${invalidRegistrations.length} invalid registrations:`, invalidRegistrations);
    throw new Error(`Invalid service registrations: ${invalidRegistrations.join(', ')}`);
  }

  fastify.log.info(`📦 Registering ${Object.keys(serviceRegistrations).length} services...`);
  
  try {
    // Debug: Log container state before registration
    fastify.log.debug('Container state before registration:', {
      hasRegistrations: !!fastify.diContainer.registrations,
      registrationCount: Object.keys(fastify.diContainer.registrations || {}).length
    });

    await fastify.diContainer.register(serviceRegistrations);
    
    fastify.log.info('✅ All services registered successfully');
    
    // Debug: Log container state after registration
    fastify.log.debug('Container state after registration:', {
      registrationCount: Object.keys(fastify.diContainer.registrations || {}).length,
      registeredServices: Object.keys(fastify.diContainer.registrations || {})
    });
    
  } catch (error) {
    fastify.log.error('❌ Failed to register services:', error.message);
    fastify.log.error('Error stack:', error.stack);
    throw error;
  }

  fastify.log.info('🎉 DI plugin initialization completed successfully');
}, {
  encapsulate: false,  // 🔧 CRITICAL: Make DI container globally accessible
  name: 'diPlugin'     // 🔧 Give it a name for dependency tracking
});