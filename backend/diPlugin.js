/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { asClass, asValue, Lifetime } = require('awilix');

const infraConfig = require('./infraConfig.json');

const Account = require('./aop_modules/auth/domain/entities/account');
const User = require('./aop_modules/auth/domain/entities/user');
const UserService = require('./aop_modules/auth/application/services/userService');
const PermService = require('./aop_modules/permissions/application/services/permService');
const AuthPostgresAdapter = require('./aop_modules/auth/infrastructure/persistence/authPostgresAdapter');
const AuthRedisAdapter = require('./aop_modules/auth/infrastructure/in_memory_storage/authRedisAdapter');

const ChatService = require('./business_modules/chat/application/services/chatService');
const ChatPostgresAdapter = require('./business_modules/chat/infrastructure/persistence/chatPostgresAdapter');
const ChatPubsubAdapter = require('./business_modules/chat/infrastructure/messaging/pubsub/chatPubsubAdapter');

const GitService = require('./business_modules/git/application/services/gitService');
// const GitPostgresAdapter = require('./business_modules/git/infrastructure/persistence/gitPostgresAdapter');
const GitGithubAdapter = require('./business_modules/git/infrastructure/git/gitGithubAdapter');
const GitPubsubAdapter = require('./business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter');

const TargetService = require('./business_modules/target/application/services/targetService');
const TargetPostgresAdapter = require('./business_modules/target/infrastructure/persistence/targetPostgresAdapter');
const TargetGithubAdapter = require('./business_modules/target/infrastructure/git/targetGithubAdapter');
const TargetLangchainAdapter = require('./business_modules/target/infrastructure/ai/targetLangchainAdapter');

const WikiService = require('./business_modules/wiki/application/services/wikiService');
// const WikiPostgresAdapter = require('./business_modules/wiki/infrastructure/persistence/wikiPostgresAdapter');
const WikiPubsubAdapter = require('./business_modules/wiki/infrastructure/messaging/pubsub/wikiPubsubAdapter');

const ChecklistPostgresAdapter = require('./business_modules/checklist/infrastructure/persistence/checklistPostgresAdapter');

const AIService = require('./business_modules/ai/application/services/aiService');
const AIPostgresAdapter = require('./business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
const AIPubsubAdapter = require('./business_modules/ai/infrastructure/messaging/pubsub/aiPubsubAdapter');
const AIGithubAdapter = require('./business_modules/ai/infrastructure/git/aiGithubAdapter');
const AIGithubWikiAdapter = require('./business_modules/ai/infrastructure/wiki/aiGithubWikiAdapter');

const { PubSub } = require('@google-cloud/pubsub');
const { Connector } = require('@google-cloud/cloud-sql-connector');

module.exports = fp(async function (fastify, opts) {
  try {
    await fastify.register(fastifyAwilixPlugin, {
      disposeOnClose: true,
      disposeOnResponse: true,
      strictBooleanEnforced: true,
      injectionMode: 'CLASSIC',
      encapsulate: false,
    });
  } catch (error) {

    fastify.log.error(`Failed to register fastifyAwilixPlugin: ${error.message}`); 
    throw fastify.httpErrors.internalServerError(
      'Failed to register fastifyAwilixPlugin',
      { cause: error } 
    );
  }

  const adapters = {
    authPostgresAdapter: asClass(AuthPostgresAdapter).singleton(),
    authRedisAdapter: asClass(AuthRedisAdapter).singleton(),
    chatPostgresAdapter: asClass(ChatPostgresAdapter).scoped(),
    chatPubsubAdapter: asClass(ChatPubsubAdapter).scoped(),

    gitGithubAdapter: asClass(GitGithubAdapter).scoped(),
    gitPubsubAdapter: asClass(GitPubsubAdapter).scoped(),


    targetPostgresAdapter: asClass(TargetPostgresAdapter).scoped(),
    targetGithubAdapter: asClass(TargetGithubAdapter).scoped(),
    targetLangchainAdapter: asClass(TargetLangchainAdapter).scoped(),
    checklistPostgresAdapter: asClass(ChecklistPostgresAdapter).scoped(),

    aiPostgresAdapter: asClass(AIPostgresAdapter).scoped(),
    aiLangchainAdapter: asClass(AILangchainAdapter).scoped(),
    aiPubsubAdapter: asClass(AIPubsubAdapter).scoped(),
    aiGithubAdapter: asClass(AIGithubAdapter).scoped(),
    aiGithubWikiAdapter: asClass(AIGithubWikiAdapter).scoped(),

    wikiPubsubAdapter: asClass(WikiPubsubAdapter).scoped()
  };

  const cloudSqlConnector = new Connector();
  await fastify.diContainer.register({
    cloudSqlConnector: asValue(cloudSqlConnector)
  });
  fastify.log.info('✅ Cloud SQL Connector initialized and registered in DI container.');

 
  const pubSubClient = new PubSub(); // This client will automatically use ADC!
  await fastify.diContainer.register({
    pubSubClient: asValue(pubSubClient)
  });
  fastify.log.info('✅ Pub/Sub Client initialized and registered in DI container.');

  await fastify.diContainer.register({
    account: asClass(Account),
    user: asClass(User),

    chatService: asClass(ChatService, {
      lifetime: Lifetime.scoped,
    }),
    gitService: asClass(GitService, {
      lifetime: Lifetime.scoped,
    }),
    wikiService: asClass(WikiService, {
      lifetime: Lifetime.scoped,
    }),
    targetService: asClass(TargetService, {
      lifetime: Lifetime.scoped,
    }),
    aiService: asClass(AIService, {
      lifetime: Lifetime.scoped,
    }),
    userService: asClass(UserService),
    permService: asClass(PermService),

    wikiMessagingAdapter: adapters[infraConfig.business_modules.wiki.wikiMessagingAdapter],

    authPersistAdapter: adapters[infraConfig.aop_modules.auth.authPersistAdapter],
    authInMemStorageAdapter: adapters[infraConfig.aop_modules.auth.authInMemStorageAdapter],

    chatPersistAdapter: adapters[infraConfig.business_modules.chat.chatPersistAdapter],
    chatMessagingAdapter: adapters[infraConfig.business_modules.chat.chatMessagingAdapter],

    // gitPersistAdapter: adapters[infraConfig.business_modules.git.gitPersistAdapter],
    gitGitAdapter: adapters[infraConfig.business_modules.git.gitGitAdapter],
    gitMessagingAdapter: adapters[infraConfig.business_modules.git.gitMessagingAdapter],

    targetPersistAdapter: adapters[infraConfig.business_modules.target.targetPersistAdapter],
    targetGitAdapter: adapters[infraConfig.business_modules.target.targetGitAdapter],
    targetAIAdapter: adapters[infraConfig.business_modules.target.targetAIAdapter],
    
    checklistPersistAdapter: adapters[infraConfig.business_modules.checklist.checklistPersistAdapter],
    
    aiAIAdapter: adapters[infraConfig.business_modules.ai.aiAIAdapter],
    aiPersistAdapter: adapters[infraConfig.business_modules.ai.aiPersistAdapter],
    aiMessagingAdapter: adapters[infraConfig.business_modules.ai.aiMessagingAdapter],
    aiGitAdapter: adapters[infraConfig.business_modules.ai.aiGitAdapter],
    aiWikiAdapter: adapters[infraConfig.business_modules.ai.aiWikiAdapter]
  });
});
